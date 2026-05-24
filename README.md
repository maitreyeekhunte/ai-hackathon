# Expense Tracker - Backend (FastAPI)

This is a minimal backend for an expense tracker. Features:
- Manual expense creation
- Upload CSV bank statements to extract expenses
- List expenses filtered by date range or month

Quick start

1. Create a virtualenv and activate it

```bash
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Run the app

```bash
uvicorn app.main:app --reload
```

3. Open docs at http://127.0.0.1:8000/docs
