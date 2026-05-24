from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import date, datetime
import calendar

from .database import init_db, get_session
from sqlmodel import Session
from .models import Expense
from .crud import create_expense, get_expenses_by_date_range, bulk_create_expenses
from .utils.parser import parse_csv_statement, try_parse_date

app = FastAPI(title="Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.post("/expenses", response_model=Expense)
def add_expense(expense_in: Expense, session: Session = Depends(get_session)):
    try:
        # Normalize/parse date if client sent a string
        dt = expense_in.date
        if isinstance(dt, str):
            try:
                dt = try_parse_date(dt)
            except Exception:
                try:
                    from datetime import date as _date
                    dt = _date.fromisoformat(dt)
                except Exception as ex:
                    raise HTTPException(status_code=400, detail=f"Invalid date format: {ex}")
        # Build a new Expense to avoid inserting client-provided id or malformatted fields
        db_expense = Expense(description=expense_in.description, category=expense_in.category, amount=expense_in.amount, date=dt)
        return create_expense(session, expense=db_expense)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload-statement", response_model=List[Expense])
async def upload_statement(file: UploadFile = File(...), session: Session = Depends(get_session)):
    filename = file.filename or ''
    content = await file.read()
    text = None
    # Only CSV supported for now
    if filename.lower().endswith('.csv') or file.content_type in ('text/csv', 'application/vnd.ms-excel'):
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
    else:
        raise HTTPException(status_code=400, detail='Only CSV statement uploads are supported in this MVP')

    parsed = parse_csv_statement(text)
    expenses = []
    for row in parsed:
        e = Expense(description=row.get('description', ''), category=row.get('category', 'uncategorized'), amount=row.get('amount', 0.0), date=row.get('date'))
        expenses.append(e)
    created = bulk_create_expenses(session, expenses=expenses)
    return created


@app.get("/expenses", response_model=List[Expense])
def list_expenses(start_date: Optional[date] = Query(None), end_date: Optional[date] = Query(None), month: Optional[str] = Query(None), session: Session = Depends(get_session)):
    if month:
        try:
            dt = datetime.strptime(month, "%Y-%m")
            start = date(dt.year, dt.month, 1)
            last = calendar.monthrange(dt.year, dt.month)[1]
            end = date(dt.year, dt.month, last)
            start_date = start
            end_date = end
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    if start_date and end_date:
        return get_expenses_by_date_range(session, start_date, end_date)
    elif start_date and not end_date:
        return get_expenses_by_date_range(session, start_date, date.today())
    else:
        # default: return last 30 days
        from datetime import timedelta
        end = date.today()
        start = end - timedelta(days=30)
        return get_expenses_by_date_range(session, start, end)
