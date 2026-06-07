import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Numeric, func, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///./catatstock_auth.db'

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    phone = Column(String(20), nullable=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime)


class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_code = Column(String(50), nullable=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=True)
    image_emoji = Column(String(10), nullable=True)
    image_data = Column(LargeBinary, nullable=True)
    image_mime = Column(String(100), nullable=True)
    price_buy = Column(Numeric(18, 2), nullable=False, default=0)
    price_sell = Column(Numeric(18, 2), nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    # persisted 7-day average daily sales (includes zeros for days without sales)
    avg_daily_sales = Column(Numeric(10, 2), nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    type = Column(String(20), nullable=False)  # 'in' or 'out'
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(18, 2), nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())


def init_db():
    Base.metadata.create_all(bind=engine)
