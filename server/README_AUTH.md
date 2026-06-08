Flask auth blueprint

Setup
1. Create a virtualenv and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r server/requirements.txt
```

2. Set environment variables (example):

PowerShell:

```powershell
$env:DATABASE_URL = "mssql+pyodbc://sa:YourPass@localhost:1433/CatatStock?driver=ODBC+Driver+17+for+SQL+Server"
$env:SECRET_KEY = "replace-with-secure-key"
python server/app.py
```

Or use SQLite for quick local tests:

```powershell
$env:DATABASE_URL = "sqlite:///./catatstock_auth.db"
$env:SECRET_KEY = "dev-key"
python server/app.py
```

3. Endpoints:
- POST /register  { name, email, phone, password }
- POST /login     { email, password }

The routes return a JSON with a JWT token on success.
