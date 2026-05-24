from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import urllib.request
import urllib.error

from .auth import auth_bp
from .products import products_bp
from .models import init_db

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')
    app.config['DATABASE_URL'] = os.environ.get('DATABASE_URL')
    CORS(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)

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
                return jsonify(res_data)
        except urllib.error.URLError as e:
            return jsonify({'error': f'AI server connection error: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    # initialize database tables if not present (SQLite fallback)
    try:
        init_db()
    except Exception:
        pass
    app.run(host='0.0.0.0', port=5000, debug=True)
