from typing import List
from sqlmodel import select
from datetime import date
from .models import Expense
from .database import engine
from sqlmodel import Session

def create_expense(session: Session, *, expense: Expense) -> Expense:
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

def bulk_create_expenses(session: Session, *, expenses: List[Expense]) -> List[Expense]:
    session.add_all(expenses)
    session.commit()
    for e in expenses:
        session.refresh(e)
    return expenses

def get_expenses_by_date_range(session: Session, start_date: date, end_date: date) -> List[Expense]:
    statement = select(Expense).where(Expense.date >= start_date, Expense.date <= end_date).order_by(Expense.date)
    results = session.exec(statement).all()
    return results
