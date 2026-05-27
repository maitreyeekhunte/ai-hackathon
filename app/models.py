from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class CategoryRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    keyword: str
    category: str
    priority: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class MerchantMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    merchant: str
    category: str
    source: str = Field(default="global")  # 'global', 'user', 'ai'
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class CategoryFeedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id")
    old_category: str
    new_category: str
    merchant: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str
    category: str
    amount: float
    date: date
    merchant: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: bool = False
    recurring_frequency: Optional[str] = Field(default=None)  # 'daily','weekly','monthly','yearly'
    recurring_id: Optional[int] = Field(default=None, foreign_key="recurringtransaction.id")
    parent_transaction_id: Optional[int] = Field(default=None, foreign_key="expense.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class Attachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id")
    filename: str
    filepath: str
    file_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class RecurringTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pattern: str  # 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
    description: str
    category: str
    amount: float
    merchant: Optional[str] = None
    last_detected: date
    confidence: float = 0.0  # 0-1 score for how confident we are it's recurring
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class LinkedAccount(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bank_name: str
    account_type: str  # 'checking', 'savings', 'credit'
    last_sync: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class TransactionSplit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_transaction_id: int = Field(foreign_key="expense.id")
    category: str
    amount: float
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class Budget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    period_type: str  # 'monthly' or 'custom'
    month: Optional[str] = None  # YYYY-MM (for monthly budgets)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_budget: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    __table_args__ = {"extend_existing": True}


class CategoryBudget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    budget_id: int = Field(foreign_key="budget.id")
    category: str
    amount: float
    __table_args__ = {"extend_existing": True}


