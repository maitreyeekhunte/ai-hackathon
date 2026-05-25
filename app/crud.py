from typing import List
from sqlmodel import select
from datetime import date
from .models import Expense, Attachment, LinkedAccount, RecurringTransaction
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


def create_attachment(session: Session, *, attachment: Attachment) -> Attachment:
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    return attachment


def get_attachments_by_expense(session: Session, expense_id: int) -> List[Attachment]:
    statement = select(Attachment).where(Attachment.expense_id == expense_id)
    return session.exec(statement).all()


def create_linked_account(session: Session, *, account: LinkedAccount) -> LinkedAccount:
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


def get_linked_accounts(session: Session) -> List[LinkedAccount]:
    statement = select(LinkedAccount)
    return session.exec(statement).all()


def get_recurring_transactions(session: Session) -> List[RecurringTransaction]:
    statement = select(RecurringTransaction)
    return session.exec(statement).all()
