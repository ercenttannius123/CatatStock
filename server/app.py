from flask import Flask
from flask_cors import CORS
import os

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
    return app

if __name__ == '__main__':
    app = create_app()
    # initialize database tables if not present (SQLite fallback)
    try:
        init_db()
    except Exception:
        pass
    app.run(host='0.0.0.0', port=5000, debug=True)
