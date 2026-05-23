from flask import Blueprint, request, jsonify, current_app
from .models import SessionLocal, Product, User
import jwt
from datetime import datetime

products_bp = Blueprint('products', __name__)

def get_user_from_token(auth_header):
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
        db = SessionLocal()
        try:
            return db.query(User).filter(User.id == int(user_id)).first()
        finally:
            db.close()
    except Exception:
        return None


@products_bp.route('/products', methods=['GET'])
def list_products():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user = get_user_from_token(auth)
    if not user:
        return jsonify({'error': 'unauthorized'}), 401
    db = SessionLocal()
    try:
        prods = db.query(Product).filter(Product.user_id == user.id).all()
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
    user = get_user_from_token(auth)
    if not user:
        return jsonify({'error': 'unauthorized'}), 401
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            return jsonify({'error': 'not found'}), 404
        if p.user_id != user.id:
            return jsonify({'error': 'forbidden'}), 403
        db.delete(p)
        db.commit()
        return jsonify({'status': 'deleted', 'id': product_id}), 200
    finally:
        db.close()


@products_bp.route('/products', methods=['POST'])
def create_product():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user = get_user_from_token(auth)
    if not user:
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

    db = SessionLocal()
    try:
        p = Product(user_id=user.id, product_code=product_code, name=name,
                    category=category, image_emoji=image_emoji,
                    price_buy=price_buy, stock=stock, created_at=datetime.utcnow())
        db.add(p)
        db.commit()
        db.refresh(p)
        return jsonify({'id': p.id, 'name': p.name, 'stock': p.stock}), 201
    finally:
        db.close()
