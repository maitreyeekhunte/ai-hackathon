from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import date, datetime, timedelta
import calendar
import os
from pathlib import Path

from .database import init_db, get_session
from sqlmodel import Session, select
from .models import (
    Expense, Attachment, RecurringTransaction, LinkedAccount, TransactionSplit,
    Category, CategoryRule, MerchantMapping, CategoryFeedback,
)
from .crud import (
    create_expense, get_expenses_by_date_range, bulk_create_expenses,
    get_categories, create_category, rename_category, delete_category,
    get_category_rules, create_category_rule, delete_category_rule,
    get_merchant_mappings, upsert_merchant_mapping, delete_merchant_mapping,
    record_category_feedback,
)
from .utils.categorizer import categorize_transaction, batch_categorize, PREDEFINED_CATEGORIES
from pydantic import BaseModel
from .utils.parser import parse_csv_statement, parse_pdf_statement, try_parse_date

app = FastAPI(title="Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.on_event("startup")
def on_startup():
    init_db()
    # Migrate: add recurring_frequency column if it doesn't exist
    import sqlite3
    db_path = Path("expenses.db")
    if db_path.exists():
        con = sqlite3.connect(str(db_path))
        cols = [row[1] for row in con.execute("PRAGMA table_info(expense)").fetchall()]
        if "recurring_frequency" not in cols:
            con.execute("ALTER TABLE expense ADD COLUMN recurring_frequency TEXT")
            con.commit()
        con.close()


# ===== EXPENSE ENDPOINTS =====

@app.post("/expenses/recategorize")
def recategorize_expenses(session: Session = Depends(get_session)):
    """Re-run AI categorisation on all expenses whose category is Other or uncategorized."""
    targets = session.exec(
        select(Expense).where(
            (Expense.category == "Other") | (Expense.category == "uncategorized") | (Expense.category == "")
        )
    ).all()
    updated = 0
    for expense in targets:
        new_cat = categorize_transaction(session, expense.description, expense.merchant, expense.amount)
        if new_cat != expense.category:
            expense.category = new_cat
            expense.updated_at = datetime.utcnow()
            session.add(expense)
            updated += 1
    session.commit()
    return {"recategorized": updated, "total_checked": len(targets)}


@app.get("/expenses/recurring", response_model=List[Expense])
def get_recurring_expenses(session: Session = Depends(get_session)):
    """Return all expenses explicitly marked as recurring by the user."""
    return session.exec(
        select(Expense)
        .where(Expense.is_recurring == True)
        .where(Expense.parent_transaction_id == None)
        .order_by(Expense.date.desc())
    ).all()


@app.post("/expenses", response_model=Expense)
def add_expense(expense_in: Expense, session: Session = Depends(get_session)):
    try:
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
        
        category = expense_in.category
        if not category or category.strip().lower() in ("uncategorized", ""):
            category = categorize_transaction(
                session, expense_in.description, expense_in.merchant, expense_in.amount
            )

        db_expense = Expense(
            description=expense_in.description,
            category=category,
            amount=expense_in.amount,
            date=dt,
            merchant=expense_in.merchant,
            notes=expense_in.notes,
            is_recurring=expense_in.is_recurring,
            recurring_frequency=expense_in.recurring_frequency if expense_in.is_recurring else None,
        )
        return create_expense(session, expense=db_expense)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
        end = date.today()
        start = end - timedelta(days=30)
        return get_expenses_by_date_range(session, start, end)


@app.get("/expenses/{expense_id}", response_model=Expense)
def get_expense(expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@app.put("/expenses/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, expense_in: Expense, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.description = expense_in.description
    expense.category = expense_in.category
    expense.amount = expense_in.amount
    expense.date = expense_in.date
    expense.merchant = expense_in.merchant
    expense.notes = expense_in.notes
    expense.is_recurring = expense_in.is_recurring
    expense.recurring_frequency = expense_in.recurring_frequency if expense_in.is_recurring else None
    expense.updated_at = datetime.utcnow()
    
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Delete associated attachments
    attachments = session.exec(select(Attachment).where(Attachment.expense_id == expense_id)).all()
    for attachment in attachments:
        if os.path.exists(attachment.filepath):
            os.remove(attachment.filepath)
        session.delete(attachment)
    
    # Delete splits
    splits = session.exec(select(TransactionSplit).where(TransactionSplit.parent_transaction_id == expense_id)).all()
    for split in splits:
        session.delete(split)
    
    session.delete(expense)
    session.commit()
    return {"detail": "Expense deleted successfully"}


# ===== ATTACHMENT ENDPOINTS =====

@app.post("/expenses/{expense_id}/attachments")
async def upload_attachment(expense_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    try:
        content = await file.read()
        filename = f"{expense_id}_{datetime.utcnow().timestamp()}_{file.filename}"
        filepath = UPLOAD_DIR / filename
        
        with open(filepath, "wb") as f:
            f.write(content)
        
        attachment = Attachment(
            expense_id=expense_id,
            filename=file.filename or "unknown",
            filepath=str(filepath),
            file_type=file.content_type or "application/octet-stream"
        )
        session.add(attachment)
        session.commit()
        session.refresh(attachment)
        return attachment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")


@app.get("/expenses/{expense_id}/attachments", response_model=List[Attachment])
def get_attachments(expense_id: int, session: Session = Depends(get_session)):
    attachments = session.exec(select(Attachment).where(Attachment.expense_id == expense_id)).all()
    return attachments


@app.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, session: Session = Depends(get_session)):
    attachment = session.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    if os.path.exists(attachment.filepath):
        os.remove(attachment.filepath)
    
    session.delete(attachment)
    session.commit()
    return {"detail": "Attachment deleted successfully"}


# ===== SPLIT TRANSACTION ENDPOINTS =====

@app.post("/expenses/{expense_id}/split", response_model=List[Expense])
def split_transaction(expense_id: int, splits_data: List[dict], session: Session = Depends(get_session)):
    parent_expense = session.get(Expense, expense_id)
    if not parent_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Validate split amounts sum to parent amount
    total_split = sum(s["amount"] for s in splits_data)
    if abs(total_split - parent_expense.amount) > 0.01:
        raise HTTPException(status_code=400, detail="Split amounts must sum to parent transaction amount")
    
    created_expenses = []
    
    for split_data in splits_data:
        split_expense = Expense(
            description=parent_expense.description,
            category=split_data.get("category", parent_expense.category),
            amount=split_data["amount"],
            date=parent_expense.date,
            merchant=parent_expense.merchant,
            notes=split_data.get("notes", ""),
            parent_transaction_id=expense_id
        )
        session.add(split_expense)
        session.flush()
        created_expenses.append(split_expense)
    
    # Mark parent as split
    parent_expense.updated_at = datetime.utcnow()
    session.add(parent_expense)
    session.commit()
    
    return created_expenses


@app.get("/expenses/{expense_id}/splits", response_model=List[Expense])
def get_splits(expense_id: int, session: Session = Depends(get_session)):
    splits = session.exec(select(Expense).where(Expense.parent_transaction_id == expense_id)).all()
    return splits


# ===== RECURRING TRANSACTION ENDPOINTS =====

@app.get("/recurring", response_model=List[RecurringTransaction])
def get_recurring_transactions(session: Session = Depends(get_session)):
    recurrings = session.exec(select(RecurringTransaction)).all()
    return recurrings


@app.post("/recurring/detect")
def detect_recurring_transactions(session: Session = Depends(get_session)):
    """Detect and flag recurring transactions based on historical data"""
    expenses = session.exec(select(Expense).where(Expense.parent_transaction_id == None)).all()
    
    if len(expenses) < 2:
        return {"detected": 0, "message": "Not enough transactions to detect patterns"}
    
    recurring_patterns = {}
    
    # Simple pattern detection: same description/merchant within 30 days
    for exp in expenses:
        key = f"{exp.merchant or exp.description}_{exp.category}_{round(exp.amount, 2)}"
        if key not in recurring_patterns:
            recurring_patterns[key] = []
        recurring_patterns[key].append(exp)
    
    detected_count = 0
    for key, group in recurring_patterns.items():
        if len(group) >= 2:
            # Calculate confidence based on frequency
            dates = sorted([e.date for e in group])
            if len(dates) >= 2:
                intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
                avg_interval = sum(intervals) / len(intervals)
                
                # Determine pattern
                if 0 <= avg_interval <= 2:
                    pattern = "daily"
                elif 5 <= avg_interval <= 10:
                    pattern = "weekly"
                elif 13 <= avg_interval <= 16:
                    pattern = "biweekly"
                elif 28 <= avg_interval <= 32:
                    pattern = "monthly"
                elif 365 <= avg_interval <= 370:
                    pattern = "yearly"
                else:
                    continue
                
                confidence = min(1.0, len(group) / 5)
                
                recurring = RecurringTransaction(
                    pattern=pattern,
                    description=group[0].description,
                    category=group[0].category,
                    amount=group[0].amount,
                    merchant=group[0].merchant,
                    last_detected=dates[-1],
                    confidence=confidence
                )
                session.add(recurring)
                detected_count += 1
    
    # Mark transactions as recurring
    for exp in expenses:
        if exp.description:
            matching_recurring = session.exec(
                select(RecurringTransaction).where(
                    (RecurringTransaction.description == exp.description) |
                    (RecurringTransaction.merchant == exp.merchant)
                )
            ).first()
            if matching_recurring:
                exp.is_recurring = True
                exp.recurring_id = matching_recurring.id
                session.add(exp)
    
    session.commit()
    return {"detected": detected_count, "message": "Recurring transactions detected and flagged"}


# ===== LINKED ACCOUNTS ENDPOINTS =====

@app.get("/linked-accounts", response_model=List[LinkedAccount])
def get_linked_accounts(session: Session = Depends(get_session)):
    accounts = session.exec(select(LinkedAccount)).all()
    return accounts


@app.post("/linked-accounts", response_model=LinkedAccount)
def add_linked_account(account_in: LinkedAccount, session: Session = Depends(get_session)):
    account = LinkedAccount(
        bank_name=account_in.bank_name,
        account_type=account_in.account_type,
        is_active=True
    )
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@app.delete("/linked-accounts/{account_id}")
def remove_linked_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(LinkedAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    session.delete(account)
    session.commit()
    return {"detail": "Linked account removed"}


@app.post("/linked-accounts/{account_id}/sync")
def sync_linked_account(account_id: int, session: Session = Depends(get_session)):
    """Simulate auto-import from linked account"""
    account = session.get(LinkedAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # This would normally call bank API to fetch transactions
    # For now, just update last_sync timestamp
    account.last_sync = datetime.utcnow()
    session.add(account)
    session.commit()
    return {"detail": f"Synced {account.bank_name}", "last_sync": account.last_sync}


# ===== CSV UPLOAD =====

@app.post("/upload-statement", response_model=List[Expense])
async def upload_statement(file: UploadFile = File(...), session: Session = Depends(get_session)):
    filename = (file.filename or '').lower()
    content = await file.read()

    if filename.endswith('.pdf') or file.content_type == 'application/pdf':
        try:
            parsed = parse_pdf_statement(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Failed to parse PDF: {str(e)}')
    elif filename.endswith('.csv') or file.content_type in ('text/csv', 'application/vnd.ms-excel'):
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        parsed = parse_csv_statement(text)
    else:
        raise HTTPException(status_code=400, detail='Only CSV and PDF statement uploads are supported')

    # Batch-categorise all rows that need it in a single API call
    needs_cat = [
        row for row in parsed
        if not row.get('category') or row.get('category', '').strip().lower() in ('uncategorized', '')
    ]
    if needs_cat:
        batch_cats = batch_categorize(session, needs_cat)
        cat_iter = iter(batch_cats)
        for row in parsed:
            if not row.get('category') or row.get('category', '').strip().lower() in ('uncategorized', ''):
                row['category'] = next(cat_iter)

    expenses = []
    for row in parsed:
        description = row.get('description', '')
        merchant = row.get('merchant')
        amount = row.get('amount', 0.0)
        category = row.get('category', 'Other')
        is_recurring = bool(row.get('is_recurring', False))
        recurring_frequency = row.get('recurring_frequency') if is_recurring else None
        e = Expense(
            description=description,
            category=category,
            amount=amount,
            date=row.get('date'),
            merchant=merchant,
            is_recurring=is_recurring,
            recurring_frequency=recurring_frequency,
        )
        expenses.append(e)
    created = bulk_create_expenses(session, expenses=expenses)
    return created


# ===== RECEIPT OCR ENDPOINT =====

@app.post("/expenses/receipt-scan", response_model=dict)
async def scan_receipt(file: UploadFile = File(...)):
    """Extract transaction details from receipt image using OCR"""
    try:
        from PIL import Image
        import pytesseract
        
        content = await file.read()
        image = Image.open(image_path := f"temp_{datetime.utcnow().timestamp()}.png")
        
        with open(image_path, "wb") as f:
            f.write(content)
        
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        
        # Simple extraction (would need more sophisticated parsing in production)
        extracted = {
            "raw_text": text,
            "merchant": "Extracted Merchant",  # Would parse from OCR text
            "amount": 0.0,  # Would extract from OCR text
            "date": date.today().isoformat()
        }
        
        os.remove(image_path)
        return extracted
    except ImportError:
        raise HTTPException(status_code=400, detail="OCR libraries not installed. Install: pip install pytesseract pillow")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan receipt: {str(e)}")


# ===== CATEGORY CORRECTION & FEEDBACK (FR023) =====

class CategoryCorrectionRequest(BaseModel):
    category: str


@app.post("/expenses/{expense_id}/correct-category", response_model=Expense)
def correct_expense_category(
    expense_id: int,
    body: CategoryCorrectionRequest,
    session: Session = Depends(get_session),
):
    """Record a user category correction, update merchant mapping, and return updated expense."""
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    old_category = expense.category
    new_category = body.category

    record_category_feedback(
        session,
        expense_id=expense_id,
        old_category=old_category,
        new_category=new_category,
        merchant=expense.merchant,
        description=expense.description,
    )

    if expense.merchant:
        upsert_merchant_mapping(session, merchant=expense.merchant, category=new_category, source="user")

    expense.category = new_category
    expense.updated_at = datetime.utcnow()
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


# ===== CATEGORIES (FR021) =====

class CategoryCreateRequest(BaseModel):
    name: str
    parent_id: Optional[int] = None


class CategoryRenameRequest(BaseModel):
    name: str


@app.get("/categories")
def list_categories(session: Session = Depends(get_session)):
    """Return predefined categories plus all user-created custom categories."""
    custom = get_categories(session)
    return {"predefined": PREDEFINED_CATEGORIES, "custom": custom}


@app.post("/categories", response_model=Category)
def add_category(body: CategoryCreateRequest, session: Session = Depends(get_session)):
    return create_category(session, name=body.name, parent_id=body.parent_id)


@app.put("/categories/{category_id}", response_model=Category)
def update_category(category_id: int, body: CategoryRenameRequest, session: Session = Depends(get_session)):
    category = rename_category(session, category_id=category_id, name=body.name)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@app.delete("/categories/{category_id}")
def remove_category(category_id: int, session: Session = Depends(get_session)):
    if not delete_category(session, category_id=category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return {"detail": "Category deleted"}


# ===== CATEGORY RULES (FR022) =====

class CategoryRuleCreateRequest(BaseModel):
    keyword: str
    category: str
    priority: int = 0


@app.get("/category-rules", response_model=List[CategoryRule])
def list_category_rules(session: Session = Depends(get_session)):
    return get_category_rules(session)


@app.post("/category-rules", response_model=CategoryRule)
def add_category_rule(body: CategoryRuleCreateRequest, session: Session = Depends(get_session)):
    return create_category_rule(session, keyword=body.keyword, category=body.category, priority=body.priority)


@app.delete("/category-rules/{rule_id}")
def remove_category_rule(rule_id: int, session: Session = Depends(get_session)):
    if not delete_category_rule(session, rule_id=rule_id):
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"detail": "Rule deleted"}


# ===== MERCHANT MAPPINGS (FR024) =====

class MerchantMappingRequest(BaseModel):
    merchant: str
    category: str


@app.get("/merchant-mappings", response_model=List[MerchantMapping])
def list_merchant_mappings(session: Session = Depends(get_session)):
    return get_merchant_mappings(session)


@app.post("/merchant-mappings", response_model=MerchantMapping)
def add_merchant_mapping(body: MerchantMappingRequest, session: Session = Depends(get_session)):
    return upsert_merchant_mapping(session, merchant=body.merchant, category=body.category, source="user")


@app.delete("/merchant-mappings/{mapping_id}")
def remove_merchant_mapping(mapping_id: int, session: Session = Depends(get_session)):
    if not delete_merchant_mapping(session, mapping_id=mapping_id):
        raise HTTPException(status_code=404, detail="Merchant mapping not found")
    return {"detail": "Merchant mapping deleted"}


# ===== AUTO-CATEGORISE ENDPOINT (FR020) =====

class AutoCategoriseRequest(BaseModel):
    description: str
    merchant: Optional[str] = None
    amount: float = 0.0


@app.post("/categorise")
def auto_categorise(body: AutoCategoriseRequest, session: Session = Depends(get_session)):
    """Categorise a transaction without creating it — useful for previewing the AI result."""
    category = categorize_transaction(session, body.description, body.merchant, body.amount)
    return {"category": category}
