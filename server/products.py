from flask import Blueprint, request, jsonify, current_app
from models import SessionLocal, Product, User, Transaction
import jwt
from datetime import datetime
import json, urllib.request, urllib.error, pathlib
from PIL import Image
import io, time, os
from PIL import ImageOps, ImageEnhance
try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

try:
    from pyzbar.pyzbar import decode as pyzbar_decode
except Exception:
    pyzbar_decode = None

try:
    import pytesseract
except Exception:
    pytesseract = None

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
            try:
                last_out = db.query(Transaction).filter(Transaction.product_id == p.id, Transaction.user_id == user_id, Transaction.type == 'out').order_by(Transaction.created_at.desc()).first()
                if last_out and last_out.created_at:
                    days_not_sold = (datetime.utcnow() - last_out.created_at).days
                    if days_not_sold < 0:
                        days_not_sold = 0
                else:
                    days_not_sold = None
            except Exception:
                days_not_sold = None

            result.append({
                'id': p.id,
                'product_code': p.product_code,
                'name': p.name,
                'category': p.category,
                'image_emoji': p.image_emoji,
                'price_buy': float(p.price_buy) if p.price_buy is not None else 0,
                'price_sell': float(p.price_sell) if getattr(p, 'price_sell', None) is not None else (float(p.price_buy) if p.price_buy is not None else 0),
                'stock': p.stock,
                'created_at': p.created_at.isoformat() if p.created_at else None,
                'days_not_sold': int(days_not_sold) if days_not_sold is not None else None
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
    price_sell = data.get('price_sell') if ('price_sell' in data) else None
    stock = data.get('stock') or 0

    try:
        price_buy = float(price_buy)
        if price_sell is not None and str(price_sell).strip() != '':
            price_sell = float(price_sell)
        else:
            price_sell = price_buy
        stock = int(stock)
    except (ValueError, TypeError):
        return jsonify({'error': 'price_buy must be a number and stock must be an integer'}), 400

    if price_buy < 0 or stock < 0:
        return jsonify({'error': 'price_buy and stock must be non-negative values'}), 400

    db = SessionLocal()
    try:
        p = Product(user_id=user_id, product_code=product_code, name=name,
                category=category, image_emoji=image_emoji,
                price_buy=price_buy, price_sell=price_sell, stock=stock, created_at=datetime.utcnow())
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
    if request.form and len(request.form) > 0:
        data = request.form.to_dict()
    else:
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

        if 'price_sell' in data:
            try:
                price_sell_val = float(data['price_sell'])
                if price_sell_val < 0:
                    return jsonify({'error': 'price_sell must be non-negative'}), 400
                p.price_sell = price_sell_val
            except (ValueError, TypeError):
                return jsonify({'error': 'price_sell must be a number'}), 400
                
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
                    tx_price = p.price_sell if tx_type == 'out' else p.price_buy
                    tx = Transaction(
                        user_id=user_id,
                        product_id=p.id,
                        type=tx_type,
                        quantity=abs(diff),
                        price=tx_price,
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
    tx_type = data.get('type')
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
        else:
            if p.stock < quantity:
                return jsonify({'error': f"Stok tidak mencukupi! Sisa stok: {p.stock}"}), 400
            p.stock -= quantity
            msg_log = f"[MONITORING LOG] User {user_id} SOLD product '{p.name}' (ID: {p.id}). Stock: {old_stock} -> {p.stock} (-{quantity})"
            
        print(msg_log, flush=True)
        
        tx_price = p.price_sell if tx_type == 'out' else p.price_buy
        tx = Transaction(
            user_id=user_id,
            product_id=p.id,
            type=tx_type,
            quantity=quantity,
            price=tx_price,
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


@products_bp.route('/categories', methods=['GET'])
def list_categories_from_dataset():
    """Return unique category names found in AI/Dataset.zip (train.csv).
    This endpoint is public and returns categories found in the AI/Dataset.zip.
    """

    try:
        import zipfile, pathlib
        root = pathlib.Path(__file__).parent.parent
        zip_path = root / 'AI' / 'Dataset.zip'
        if not zip_path.exists():
            return jsonify({'categories': [], 'warning': 'Dataset.zip not found'}), 200
        cats = []
        try:
            import pandas as pd
            with zipfile.ZipFile(str(zip_path)) as z:
                names = [n for n in z.namelist() if n.lower().endswith('.csv')]
                if not names:
                    return jsonify({'categories': []}), 200
                train_name = next((n for n in names if 'train' in n.lower()), names[0])
                df = pd.read_csv(z.open(train_name), usecols=['family'])
                df.columns = df.columns.str.strip().str.lower()
                if 'family' in df.columns:
                    cats = sorted([c for c in df['family'].dropna().unique().tolist() if c])
        except Exception:
            import csv
            with zipfile.ZipFile(str(zip_path)) as z:
                names = [n for n in z.namelist() if n.lower().endswith('.csv')]
                if names:
                    train_name = next((n for n in names if 'train' in n.lower()), names[0])
                    families = set()
                    with z.open(train_name) as f:
                        reader = csv.DictReader((line.decode('utf-8', errors='ignore') for line in f))
                        for r in reader:
                            fam = r.get('family') or r.get('Family')
                            if fam:
                                families.add(fam)
                    cats = sorted(list(families))
        return jsonify({'categories': cats}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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


@products_bp.route('/reports/profit_today', methods=['GET'])
def report_profit_today():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401

    from datetime import datetime, timedelta
    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        start = datetime(today.year, today.month, today.day)
        end = start + timedelta(days=1)
        rows = db.query(Transaction, Product).join(Product, Transaction.product_id == Product.id)\
                 .filter(Transaction.user_id == user_id, Transaction.type == 'out', Transaction.created_at >= start, Transaction.created_at < end).all()

        profit = 0.0
        revenue = 0.0
        cost = 0.0
        for tx, prod in rows:
            qty = float(tx.quantity or 0)
            tx_price = float(tx.price or 0)
            buy_price = float(prod.price_buy or 0)
            revenue += tx_price * qty
            cost += buy_price * qty
            profit += (tx_price - buy_price) * qty

        return jsonify({'profit': round(profit, 2), 'revenue': round(revenue, 2), 'cost': round(cost, 2), 'tx_count': len(rows)}), 200
    finally:
        db.close()


def _ensure_dbg_dir():
    base = os.path.join(os.path.dirname(__file__), '..')
    dbg = os.path.abspath(os.path.join(base, 'debug_uploads'))
    os.makedirs(dbg, exist_ok=True)
    return dbg


@products_bp.route('/products/<int:product_id>/predict', methods=['POST'])
def product_level_predict(product_id):
    """Build a simple recent-timeseries for the product from transactions
    and forward to the AI server's /predict endpoint. Requires auth.
    """
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

        txs = db.query(Transaction).filter(Transaction.product_id == product_id, Transaction.user_id == user_id, Transaction.type == 'out').order_by(Transaction.created_at.desc()).all()
        series = []
        if txs:
            daily = {}
            for tx in txs:
                day = tx.created_at.date().isoformat()
                daily[day] = daily.get(day, 0) + (tx.quantity or 0)
            keys = sorted(daily.keys())
            for k in keys[-30:]:
                series.append(daily[k])

        payload = {'timeseries': series} if series else {'kategori': p.category or 'BEVERAGES'}
        req = urllib.request.Request('http://127.0.0.1:5005/predict', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                return jsonify(res_data)
        except urllib.error.URLError as e:
            return jsonify({'error': f'AI server connection error: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    finally:
        db.close()


def _decode_with_pyzbar(pil_img):
    if pyzbar_decode is None:
        return None
    try:
        res = pyzbar_decode(pil_img)
        if not res:
            return None
        return res[0].data.decode('utf-8')
    except Exception:
        return None


def _decode_with_tesseract(pil_img):
    if pytesseract is None:
        return None
    try:
        text = pytesseract.image_to_string(pil_img)
        if not text:
            return None
        toks = [t.strip() for t in text.split() if t.strip()]
        return toks[0] if toks else None
    except Exception:
        return None


def _generate_preprocessed_variants(pil_img, dbg_dir, ts):
    variants = []
    try:
        variants.append(('orig', pil_img))
        for scale in (1.5, 2.0, 3.0):
            w,h = pil_img.size
            imgr = pil_img.resize((int(w*scale), int(h*scale)), Image.LANCZOS)
            variants.append((f'resize_{scale}', imgr))

        try:
            enh = ImageEnhance.Contrast(pil_img)
            for f in (1.5, 2.0, 3.0):
                imgc = enh.enhance(f)
                variants.append((f'contrast_{f}', imgc))
        except Exception:
            pass

        for name, img in list(variants):
            try:
                g = img.convert('L')
                th = g.point(lambda p: 255 if p > 128 else 0)
                variants.append((f'{name}_th', th.convert('RGB')))
                inv = ImageOps.invert(g)
                variants.append((f'{name}_inv', inv.convert('RGB')))
            except Exception:
                continue

        idx = 0
        for nm, im in variants:
            try:
                path = os.path.join(dbg_dir, f'proc_var_{ts}_{idx}_{nm}.png')
                im.save(path)
            except Exception:
                pass
            idx += 1
    except Exception:
        return []
    return variants


def _find_candidate_crops_from_bytes(data_bytes, dbg_dir, ts):
    """Return list of PIL images cropped from likely barcode regions using OpenCV.
    Saves candidate crops to dbg_dir for inspection."""
    crops = []
    if cv2 is None or np is None:
        return crops
    try:
        arr = np.frombuffer(data_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return crops
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5,5), 0)
        gradX = cv2.Sobel(blur, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=3)
        gradX = cv2.convertScaleAbs(gradX)
        _, thresh = cv2.threshold(gradX, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25,7))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        closed = cv2.erode(closed, None, iterations=2)
        closed = cv2.dilate(closed, None, iterations=2)
        contours, _ = cv2.findContours(closed.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:8]
        idx = 0
        for c in contours:
            rect = cv2.minAreaRect(c)
            box = cv2.boxPoints(rect)
            box = np.int0(box)
            xs = box[:,0]
            ys = box[:,1]
            x1 = max(0, xs.min())
            x2 = min(w, xs.max())
            y1 = max(0, ys.min())
            y2 = min(h, ys.max())
            area = (x2-x1)*(y2-y1)
            if area < (w*h)*0.001:
                continue
            ar = (x2-x1)/max(1, (y2-y1))
            if ar < 1.2 and ar > 0.8:
                pass
            padx = int((x2-x1)*0.2)
            pady = int((y2-y1)*0.4)
            xa = max(0, x1-padx)
            xb = min(w, x2+padx)
            ya = max(0, y1-pady)
            yb = min(h, y2+pady)
            crop = img[ya:yb, xa:xb]
            if crop.size == 0:
                continue
            try:
                outp = os.path.join(dbg_dir, f'proc_crop_{ts}_{idx}.png')
                cv2.imwrite(outp, crop)
            except Exception:
                pass
            try:
                pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
                crops.append(pil)
            except Exception:
                pass
            idx += 1
        return crops
    except Exception:
        return []


@products_bp.route('/scan_barcode', methods=['POST'])
def scan_barcode():
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    user_id = get_user_id_from_token(auth)
    if not user_id:
        return jsonify({'error': 'unauthorized'}), 401

    dbg_dir = _ensure_dbg_dir()
    f = None
    if request.files:
        f = request.files.get('file') or request.files.get('image') or request.files.get('photo')
    raw = None
    if f:
        data = f.read()
    else:
        data = request.get_data() or b''

    ts = int(time.time())
    raw_path = os.path.join(dbg_dir, f'upload_{ts}.bin')
    try:
        with open(raw_path, 'wb') as fh:
            fh.write(data)
    except Exception:
        pass

    decode_attempts = []
    pil_img = None
    try:
        pil_img = Image.open(io.BytesIO(data)).convert('RGB')
    except Exception:
        pil_img = None

    code_value = None
    if pil_img is not None:
        variants = _generate_preprocessed_variants(pil_img, dbg_dir, ts)
        for name, img in variants:
            v = _decode_with_pyzbar(img)
            decode_attempts.append({'method': f'pyzbar_{name}', 'value': v})
            if v:
                code_value = v
                break
            v2 = _decode_with_tesseract(img)
            decode_attempts.append({'method': f'tesseract_{name}', 'value': v2})
            if v2:
                code_value = v2
                break

    if not code_value:
        crops = _find_candidate_crops_from_bytes(data, dbg_dir, ts)
        for i, crop in enumerate(crops):
            v = _decode_with_pyzbar(crop)
            decode_attempts.append({'method': f'pyzbar_crop_{i}', 'value': v})
            if v:
                code_value = v
                break
            v2 = _decode_with_tesseract(crop)
            decode_attempts.append({'method': f'tesseract_crop_{i}', 'value': v2})
            if v2:
                code_value = v2
                break

    if not code_value:
        return jsonify({'status': 'not_found', 'decode_attempts': decode_attempts}), 404

    code_value = str(code_value).strip()
    req_type = (request.form.get('type') or request.values.get('type') or 'in').lower()
    try:
        qty = int(request.form.get('quantity') or request.values.get('quantity') or 1)
    except Exception:
        qty = 1
    if req_type not in ('in', 'out'):
        req_type = 'in'

    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.user_id == user_id, Product.product_code == code_value).first()
        created = False
        if not p:
            if req_type == 'in':
                p = Product(user_id=user_id, product_code=code_value, name=f'Scanned {code_value}', category=None, image_emoji=None, price_buy=0, stock=qty, created_at=datetime.utcnow())
                db.add(p)
                db.commit()
                db.refresh(p)
                created = True
            else:
                return jsonify({'error': 'product not found for stock out', 'decode_attempts': decode_attempts}), 404

        old_stock = p.stock or 0
        if req_type == 'in':
            p.stock = old_stock + qty
            msg_log = f"[MONITORING LOG] User {user_id} RESTOCKED product '{p.name}' (ID: {p.id}). Stock: {old_stock} -> {p.stock} (+{qty})"
        else:
            if old_stock < qty:
                return jsonify({'error': f"Stok tidak mencukupi! Sisa stok: {old_stock}", 'decode_attempts': decode_attempts}), 400
            p.stock = old_stock - qty
            msg_log = f"[MONITORING LOG] User {user_id} SOLD product '{p.name}' (ID: {p.id}). Stock: {old_stock} -> {p.stock} (-{qty})"

        print(msg_log, flush=True)
        tx_price = p.price_sell if req_type == 'out' else p.price_buy
        tx = Transaction(user_id=user_id, product_id=p.id, type=req_type, quantity=qty, price=tx_price, created_at=datetime.utcnow())
        db.add(tx)
        db.commit()
        db.refresh(tx)

        return jsonify({'status': 'success', 'product_name': p.name, 'new_stock': p.stock, 'tx_id': tx.id, 'created_product': created, 'decode_attempts': decode_attempts}), 201
    finally:
        db.close()
