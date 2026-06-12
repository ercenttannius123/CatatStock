CatatStock

Aplikasi manajemen stok/inventaris berbasis web dengan fitur prediksi penjualan menggunakan machine learning.

Fitur Utama
- Manajemen Produk — Tambah, edit, dan hapus produk dengan kode, kategori, harga beli/jual, dan stok
- Transaksi Stok — Catat keluar/masuk barang dan pantau riwayat transaksi
- Dashboard — Visualisasi penjualan, ROI, tren, dan produk terlaris
- Prediksi Penjualan (AI) — Model Random Forest untuk memprediksi permintaan berdasarkan riwayat transaksi
- Restock & Slow Moving — Rekomendasi restock otomatis dan deteksi produk yang lama tidak terjual
- Cash Flow — Monitoring arus kas dari seluruh transaksi
- Barcode Scanner — Decode barcode produk lewat kamera atau upload gambar
- Autentikasi — Sistem login/register dengan JWT, setiap pengguna memiliki data terisolasi
- Dark Mode — Tampilan terang/gelap yang bisa diatur


Tech Stack

| Frontend | React 18, Vite, Chart.js, Recharts |
| Backend (API) | Flask, SQLAlchemy, PyJWT, Flask-CORS |
| AI Server | Flask, scikit-learn, pandas, numpy |
| Database | SQLite (dev) / SQL Server (prod) |
| Barcode | pyzbar, OpenCV, Pillow |


Cara Menjalankan

Prasyarat
- Node.js 18+
- Python 3.10+
- (Opsional) SQL Server dengan ODBC Driver 17 — atau gunakan SQLite untuk pengembangan lokal

1. Frontend
npm install
npm run dev


Frontend akan berjalan di `http://localhost:5173`.

Untuk mengarahkan ke backend yang berbeda, buat file `.env`:

env
VITE_API_URL=http://localhost:5000/


2. Backend (API Server)
cd server
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt

Jalankan dengan **SQLite** (lokal, tanpa konfigurasi tambahan):

$env:DATABASE_URL = "sqlite:///./catatstock_auth.db"
$env:SECRET_KEY = "ganti-dengan-key-rahasia"
python app.py

Linux/macOS
export DATABASE_URL="sqlite:///./catatstock_auth.db"
export SECRET_KEY="ganti-dengan-key-rahasia"
python app.py

3. AI Server (Opsional)

Server AI diperlukan untuk fitur prediksi penjualan.

cd AI
pip install flask flask-cors pandas numpy scikit-learn
python app.py

AI server berjalan di `http://localhost:5005`. Backend utama akan otomatis meneruskan request prediksi ke server ini.
