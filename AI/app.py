from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor

app = Flask(__name__)
CORS(app)

def train_model(kategori):
    df = pd.read_csv("./Dataset/train.csv")
    df.columns = df.columns.str.strip().str.lower()

    df = df[df["store_nbr"] == 1]
    df = df[df["family"] == kategori]

    df = df.groupby("date")["sales"].sum().reset_index()

    df["lag1"] = df["sales"].shift(1)
    df["lag2"] = df["sales"].shift(2)
    df["lag3"] = df["sales"].shift(3)
    df["lag7"] = df["sales"].shift(7)

    df = df.dropna()

    X = df[["lag1", "lag2", "lag3", "lag7"]]
    y = df["sales"]

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )

    model.fit(X, y)

    return model, df


@app.route("/")
def home():
    return {"message": "API is running 🚀"}


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    kategori = data.get("kategori", "BEVERAGES")

    model, df = train_model(kategori)

    last_data = df["sales"].values[-7:].tolist()

    input_data = np.array([
        last_data[-1],
        last_data[-2],
        last_data[-3],
        last_data[-7]
    ]).reshape(1, -1)

    pred = model.predict(input_data)[0]

    return jsonify({
        "kategori": kategori,
        "prediksi": float(pred)
    })


if __name__ == "__main__":
    app.run(debug=True)