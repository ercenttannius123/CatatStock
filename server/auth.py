from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import os

from models import SessionLocal, User

auth_bp = Blueprint('auth', __name__)

def create_token(user_id, secret, expires_minutes=60*24):
    payload = {
        'sub': str(user_id),
        'exp': datetime.utcnow() + timedelta(minutes=expires_minutes)
    }
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({'error': 'name, email, password are required'}), 400

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({'error': 'email already registered'}), 400

        hashed = generate_password_hash(password)
        user = User(name=name, email=email, phone=phone, password=hashed)
        db.add(user)
        db.commit()
        db.refresh(user)

        secret = current_app.config.get('SECRET_KEY') or os.environ.get('SECRET_KEY', 'dev-secret')
        token = create_token(user.id, secret)
        return jsonify({'id': user.id, 'email': user.email, 'name': user.name, 'token': token}), 201
    finally:
        db.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'error': 'email and password required'}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return jsonify({'error': 'invalid credentials'}), 401
        if not check_password_hash(user.password, password):
            return jsonify({'error': 'invalid credentials'}), 401

        secret = current_app.config.get('SECRET_KEY') or os.environ.get('SECRET_KEY', 'dev-secret')
        token = create_token(user.id, secret)
        return jsonify({'id': user.id, 'email': user.email, 'name': user.name, 'token': token})
    finally:
        db.close()


@auth_bp.route('/me', methods=['GET'])
def me():
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    if not auth_header:
        return jsonify({'error': 'authorization header required'}), 401

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return jsonify({'error': 'invalid authorization header'}), 401

    token = parts[1]
    secret = current_app.config.get('SECRET_KEY') or os.environ.get('SECRET_KEY', 'dev-secret')
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        user_id = payload.get('sub')
        if not user_id:
            return jsonify({'error': 'invalid token'}), 401
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({'error': 'user not found'}), 404
            return jsonify({'id': user.id, 'email': user.email, 'name': user.name})
        finally:
            db.close()
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'invalid token'}), 401
