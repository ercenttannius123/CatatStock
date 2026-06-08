from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import urllib.request
import urllib.error
import io
import tempfile
from PIL import Image
try:
    from pyzbar.pyzbar import decode as pyzbar_decode
except Exception:
    pyzbar_decode = None

from auth import auth_bp
from products import products_bp
from models import init_db
from migrate import ensure_product_image_columns
import pathlib

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')
    app.config['DATABASE_URL'] = os.environ.get('DATABASE_URL')
    CORS(app)
    
    @app.route('/', methods=['GET'])
    def home():
        return jsonify({'message': 'CatatStock API is running!', 'status': 'ok'})
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    
    @app.route('/__routes', methods=['GET'])
    def _routes():
        routes = []
        for r in app.url_map.iter_rules():
            routes.append({'rule': str(r), 'endpoint': r.endpoint, 'methods': sorted(list(r.methods))})
        return jsonify(routes)

    @app.route('/predict', methods=['POST'])
    def predict_proxy():
        try:
            data = request.get_json() or {}
            req_data = json.dumps(data).encode('utf-8')
            
            # Forward request to AI server on port 5005
            req = urllib.request.Request(
                'http://127.0.0.1:5005/predict',
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                # cache last successful AI response for offline fallback
                try:
                    cache_path = pathlib.Path(__file__).parent / 'ai_cache.json'
                    with cache_path.open('w', encoding='utf-8') as f:
                        json.dump(res_data, f, ensure_ascii=False)
                except Exception:
                    pass
                return jsonify(res_data)
        except urllib.error.URLError as e:
            # if AI server is unreachable, try returning cached response
            try:
                cache_path = pathlib.Path(__file__).parent / 'ai_cache.json'
                if cache_path.exists():
                    with cache_path.open('r', encoding='utf-8') as f:
                        cached = json.load(f)
                    # return cached response in same shape as AI server
                    if isinstance(cached, dict):
                        cached['_fallback'] = 'cached_response'
                        return jsonify(cached), 200
            except Exception:
                pass
            return jsonify({'error': f'AI server connection error: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/decode_barcode', methods=['POST'])
    def decode_barcode():
        # Accept multipart file upload or JSON with data URL
        try:
            img = None
            if 'file' in request.files:
                img_file = request.files['file']
                img = Image.open(img_file.stream).convert('RGB')
            else:
                data = request.get_json(silent=True) or {}
                data_url = data.get('data')
                if data_url and isinstance(data_url, str) and data_url.startswith('data:'):
                    header, b64 = data_url.split(',', 1)
                    import base64
                    img_bytes = base64.b64decode(b64)
                    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
                else:
                    return jsonify({'error': 'No image provided'}), 400

            if pyzbar_decode is None:
                return jsonify({'error': 'pyzbar not available on server'}), 501

            decoded = pyzbar_decode(img)
            codes = [obj.data.decode('utf-8') for obj in decoded]
            return jsonify({'codes': codes})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    # initialize database tables if not present (SQLite fallback)
    try:
        # attempt lightweight migration before creating tables
        try:
            ensure_product_image_columns()
        except Exception:
            pass
        init_db()
    except Exception:
        pass
    app.run(host='0.0.0.0', port=5000, debug=True)
