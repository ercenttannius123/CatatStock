from flask import Blueprint, request, jsonify, current_app
from .models import SessionLocal, Product, User, Transaction
import jwt
from datetime import datetime

products_bp = Blueprint('products', __name__)

def get_user_id_from_token(auth_header):
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    token = parts[1]
    secret = current_app.config.get('SECRET_KEY') or 'dev-secret'
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        user_id = payload.get('sub')
        if not user_id:
            return None
        return int(user_id)
    except Exception:
        return None


@products_bp.route('/products', methods=['GET'])
def list_products():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401
    db = SessionLocal()
    try:
        prods = db.query(Product).filter(Product.user_id == user_id).all()
        result = []
        for p in prods:
            result.append({
                'id': p.id,
                'product_code': p.product_code,
                'name': p.name,
                'category': p.category,
                'image_emoji': p.image_emoji,
                'price_buy': float(p.price_buy) if p.price_buy is not None else 0,
                'stock': p.stock,
                'created_at': p.created_at.isoformat() if p.created_at else None
            })
        return jsonify(result)
    finally:
        db.close()


@products_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            return jsonify({'error': 'not found'}), 404
        if p.user_id != user_id:
            return jsonify({'error': 'forbidden'}), 403
        db.delete(p)
        db.commit()
        return jsonify({'status': 'deleted', 'id': product_id}), 200
    finally:
        db.close()


@products_bp.route('/products', methods=['POST'])
def create_product():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'name required'}), 400
    product_code = data.get('product_code')
    category = data.get('category')
    image_emoji = data.get('image_emoji')
    price_buy = data.get('price_buy') or 0
    stock = data.get('stock') or 0

    # Validation
    try:
        price_buy = float(price_buy)
        stock = int(stock)
    except (ValueError, TypeError):
        return jsonify({'error': 'price_buy must be a number and stock must be an integer'}), 400

    if price_buy < 0 or stock < 0:
        return jsonify({'error': 'price_buy and stock must be non-negative values'}), 400

    db = SessionLocal()
    try:
        p = Product(user_id=user_id, product_code=product_code, name=name,
                    category=category, image_emoji=image_emoji,
                    price_buy=price_buy, stock=stock, created_at=datetime.utcnow())
        db.add(p)
        db.commit()
        db.refresh(p)
        return jsonify({'id': p.id, 'name': p.name, 'stock': p.stock}), 201
    finally:
        db.close()


@products_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401
    data = request.get_json() or {}
    
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            return jsonify({'error': 'not found'}), 404
        if p.user_id != user_id:
            return jsonify({'error': 'forbidden'}), 403
            
        if 'name' in data:
            p.name = data['name']
        if 'category' in data:
            p.category = data['category']
        if 'image_emoji' in data:
            p.image_emoji = data['image_emoji']
        if 'product_code' in data:
            p.product_code = data['product_code']
            
        if 'price_buy' in data:
            try:
                price_val = float(data['price_buy'])
                if price_val < 0:
                    return jsonify({'error': 'price_buy must be non-negative'}), 400
                p.price_buy = price_val
            except (ValueError, TypeError):
                return jsonify({'error': 'price_buy must be a number'}), 400
                
        if 'stock' in data:
            try:
                stock_val = int(data['stock'])
                if stock_val < 0:
                    return jsonify({'error': 'stock must be non-negative'}), 400
                old_stock = p.stock
                if old_stock != stock_val:
                    p.stock = stock_val
                    msg_log = f"[MONITORING LOG] User {user_id} UPDATED stock of product '{p.name}' (ID: {p.id}). Stock: {old_stock} -> {p.stock}"
                    print(msg_log, flush=True)
                    
                    diff = stock_val - old_stock
                    tx_type = 'in' if diff > 0 else 'out'
                    tx = Transaction(
                        user_id=user_id,
                        product_id=p.id,
                        type=tx_type,
                        quantity=abs(diff),
                        price=p.price_buy,
                        created_at=datetime.utcnow()
                    )
                    db.add(tx)
            except (ValueError, TypeError):
                return jsonify({'error': 'stock must be an integer'}), 400
                
        db.commit()
        return jsonify({'status': 'updated', 'id': product_id}), 200
    finally:
        db.close()


@products_bp.route('/transactions', methods=['POST'])
def create_transaction():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401
    
    data = request.get_json() or {}
    product_id = data.get('product_id')
    tx_type = data.get('type')  # 'in' or 'out'
    quantity = data.get('quantity')
    
    if not product_id or not tx_type or not quantity:
        return jsonify({'error': 'product_id, type, quantity are required'}), 400
        
    if tx_type not in ['in', 'out']:
        return jsonify({'error': "type must be 'in' or 'out'"}), 400
        
    try:
        quantity = int(quantity)
        if quantity <= 0:
            return jsonify({'error': 'quantity must be greater than 0'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'quantity must be an integer'}), 400
        
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == int(product_id)).first()
        if not p:
            return jsonify({'error': 'product not found'}), 404
        if p.user_id != user_id:
            return jsonify({'error': 'forbidden'}), 403
            
        old_stock = p.stock
        if tx_type == 'in':
            p.stock += quantity
            msg_log = f"[MONITORING LOG] User {user_id} RESTOCKED product '{p.name}' (ID: {p.id}). Stock: {old_stock} -> {p.stock} (+{quantity})"
        else: # tx_type == 'out'
            if p.stock < quantity:
                return jsonify({'error': f"Stok tidak mencukupi! Sisa stok: {p.stock}"}), 400
            p.stock -= quantity
            msg_log = f"[MONITORING LOG] User {user_id} SOLD product '{p.name}' (ID: {p.id}). Stock: {old_stock} -> {p.stock} (-{quantity})"
            
        # Log to console
        print(msg_log, flush=True)
        
        tx = Transaction(
            user_id=user_id,
            product_id=p.id,
            type=tx_type,
            quantity=quantity,
            price=p.price_buy,
            created_at=datetime.utcnow()
        )
        db.add(tx)
        db.commit()
        
        return jsonify({
            'status': 'success',
            'product_name': p.name,
            'new_stock': p.stock,
            'tx_id': tx.id
        }), 201
    finally:
        db.close()


@products_bp.route('/transactions', methods=['GET'])
def list_transactions():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401
        
    db = SessionLocal()
    try:
        txs = db.query(Transaction, Product.name, Product.image_emoji)\
                .join(Product, Transaction.product_id == Product.id)\
                .filter(Transaction.user_id == user_id)\
                .order_by(Transaction.created_at.desc()).all()
                
        result = []
        for tx, prod_name, prod_emoji in txs:
            result.append({
                'id': tx.id,
                'product_id': tx.product_id,
                'product_name': prod_name,
                'product_emoji': prod_emoji or '📦',
                'type': tx.type,
                'quantity': tx.quantity,
                'price': float(tx.price),
                'total_price': float(tx.price * tx.quantity),
                'created_at': tx.created_at.isoformat() if tx.created_at else None
            })
        return jsonify(result)
    finally:
        db.close()
