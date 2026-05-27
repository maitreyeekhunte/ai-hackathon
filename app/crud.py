from typing import List, Optional
from sqlmodel import select, col
from datetime import date, datetime
from .models import (
    Expense, Attachment, LinkedAccount, RecurringTransaction,
    Category, CategoryRule, MerchantMapping, CategoryFeedback,
)
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


# ── Category CRUD (FR021) ──────────────────────────────────────────────────

def get_categories(session: Session) -> List[Category]:
    return session.exec(select(Category)).all()


def create_category(session: Session, *, name: str, parent_id: Optional[int] = None) -> Category:
    category = Category(name=name, parent_id=parent_id)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def rename_category(session: Session, *, category_id: int, name: str) -> Optional[Category]:
    category = session.get(Category, category_id)
    if not category:
        return None
    category.name = name
    category.updated_at = datetime.utcnow()
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def delete_category(session: Session, *, category_id: int) -> bool:
    category = session.get(Category, category_id)
    if not category:
        return False
    session.delete(category)
    session.commit()
    return True


# ── CategoryRule CRUD (FR022) ──────────────────────────────────────────────

def get_category_rules(session: Session) -> List[CategoryRule]:
    return session.exec(select(CategoryRule).order_by(col(CategoryRule.priority).desc())).all()


def create_category_rule(session: Session, *, keyword: str, category: str, priority: int = 0) -> CategoryRule:
    rule = CategoryRule(keyword=keyword, category=category, priority=priority)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


def delete_category_rule(session: Session, *, rule_id: int) -> bool:
    rule = session.get(CategoryRule, rule_id)
    if not rule:
        return False
    session.delete(rule)
    session.commit()
    return True


# ── MerchantMapping CRUD (FR024) ───────────────────────────────────────────

def get_merchant_mappings(session: Session) -> List[MerchantMapping]:
    return session.exec(select(MerchantMapping)).all()


def upsert_merchant_mapping(session: Session, *, merchant: str, category: str, source: str = "user") -> MerchantMapping:
    normalized = merchant.lower().strip()
    existing = session.exec(
        select(MerchantMapping).where(MerchantMapping.merchant == normalized)
    ).first()
    if existing:
        existing.category = category
        existing.source = source
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    mapping = MerchantMapping(merchant=normalized, category=category, source=source)
    session.add(mapping)
    session.commit()
    session.refresh(mapping)
    return mapping


def delete_merchant_mapping(session: Session, *, mapping_id: int) -> bool:
    mapping = session.get(MerchantMapping, mapping_id)
    if not mapping:
        return False
    session.delete(mapping)
    session.commit()
    return True


# ── CategoryFeedback (FR023) ───────────────────────────────────────────────

def record_category_feedback(
    session: Session,
    *,
    expense_id: int,
    old_category: str,
    new_category: str,
    merchant: Optional[str],
    description: Optional[str],
) -> CategoryFeedback:
    feedback = CategoryFeedback(
        expense_id=expense_id,
        old_category=old_category,
        new_category=new_category,
        merchant=merchant,
        description=description,
    )
    session.add(feedback)
    session.commit()
    session.refresh(feedback)
    return feedback
