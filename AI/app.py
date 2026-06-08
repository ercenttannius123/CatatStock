from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor

app = Flask(__name__)
CORS(app)

def train_model(kategori):
    import zipfile
    try:
        with zipfile.ZipFile("./Dataset.zip") as z:
            names = z.namelist()
            # prefer a file named like 'train.csv', otherwise pick first .csv
            csv_candidates = [n for n in names if n.lower().endswith('.csv')]
            if not csv_candidates:
                raise FileNotFoundError('no csv file in Dataset.zip')
            csv_name = next((n for n in csv_candidates if 'train' in n.lower()), csv_candidates[0])
            with z.open(csv_name) as f:
                df = pd.read_csv(f)
    except FileNotFoundError:
        with zipfile.ZipFile("AI/Dataset.zip") as z:
            names = z.namelist()
            csv_candidates = [n for n in names if n.lower().endswith('.csv')]
            if not csv_candidates:
                raise FileNotFoundError('no csv file in AI/Dataset.zip')
            csv_name = next((n for n in csv_candidates if 'train' in n.lower()), csv_candidates[0])
            with z.open(csv_name) as f:
                df = pd.read_csv(f)
    df.columns = df.columns.str.strip().str.lower()

    df = df[df["store_nbr"] == 1]
    df = df[df["family"] == kategori]

    df = df.groupby("date")["sales"].sum().reset_index()

    df["lag1"] = df["sales"].shift(1)
    df["lag2"] = df["sales"].shift(2)
    df["lag3"] = df["sales"].shift(3)
    df["lag7"] = df["sales"].shift(7)

    df = df.dropna()

    if df.empty or len(df) < 1:
        raise ValueError(f'No training data available for category: {kategori}')

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
    # If caller provides explicit timeseries (per-day sales for a product), use it
    timeseries = None
    if data:
        timeseries = data.get('timeseries')

    if timeseries and isinstance(timeseries, list):
        # Build DataFrame from provided timeseries
        try:
            ts = pd.Series(timeseries).astype(float)
            df_ts = pd.DataFrame({'sales': ts})
            # create lag features
            df_ts['lag1'] = df_ts['sales'].shift(1)
            df_ts['lag2'] = df_ts['sales'].shift(2)
            df_ts['lag3'] = df_ts['sales'].shift(3)
            df_ts['lag7'] = df_ts['sales'].shift(7)
            df_feat = df_ts.dropna()
            if df_feat.empty:
                return jsonify({
                    'prediksi': 0.0,
                    'warning': 'not enough timeseries data for prediction'
                }), 200

            X = df_feat[['lag1','lag2','lag3','lag7']]
            y = df_feat['sales']

            # train a small model on sliding windows
            model = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42)
            model.fit(X, y)

            # prepare last input from most recent available points
            last_row = df_ts[['lag1','lag2','lag3','lag7']].iloc[-1].values.reshape(1, -1)
            pred = model.predict(last_row)[0]
            return jsonify({ 'prediksi': float(pred) })
        except Exception as e:
            return jsonify({'prediksi': 0.0, 'warning': str(e)}), 200

    # Fallback: category-based prediction (original behavior)
    kategori = data.get("kategori", "BEVERAGES")

    try:
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
    except ValueError as e:
        # No training data for this category — return safe fallback prediction
        return jsonify({
            "kategori": kategori,
            "prediksi": 0.0,
            "warning": str(e)
        }), 200


if __name__ == "__main__":
    app.run(port=5005, debug=True)