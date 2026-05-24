from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date

class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str
    category: str
    amount: float
    date: date
