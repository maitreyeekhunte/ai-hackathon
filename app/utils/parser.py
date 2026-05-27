import csv
import io
import re
from datetime import datetime, date
from typing import List, Dict, Optional

COMMON_DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%d %b %Y",
    "%d%b%Y",   # 19Jan2026 (no separator)
    "%Y/%m/%d", # 2026/01/27
    "%d-%b-%y", "%d/%b/%Y",
]

def try_parse_date(value: str) -> date:
    value = value.strip()
    try:
        return date.fromisoformat(value)
    except Exception:
        pass
    for fmt in COMMON_DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except Exception:
            continue
    for sep in ['/', '-', '.']:
        parts = value.split(sep)
        if len(parts) == 3:
            try:
                p0, p1, p2 = parts
                if len(p0) == 4:
                    return datetime.strptime(value, "%Y"+sep+"%m"+sep+"%d").date()
            except Exception:
                pass
    raise ValueError(f"Unrecognized date format: {value}")

def _find_csv_key(keys: dict, *keywords) -> Optional[str]:
    """Return the first key that contains any of the given keywords (case-insensitive)."""
    for keyword in keywords:
        match = next((k for k in keys if keyword in k), None)
        if match:
            return match
    return None


_RECURRING_TRUTHY = {'yes', 'true', '1', 'y'}
_VALID_FREQUENCIES = {'daily', 'weekly', 'monthly', 'yearly'}


def parse_csv_statement(text: str) -> List[Dict]:
    """Parse CSV with any column order. Recognised header variants:

    Date      : date, trans date, transaction date, posting date, value date
    Desc      : description, desc, narrative, narration, particulars, remarks,
                merchant, payee, vendor, name, details, memo
    Amount    : amount, amt, debit, credit, withdrawal, deposit, sum, inr, value
    Merchant  : merchant, payee, vendor (used only when a separate description col exists)
    Category  : category, cat, type, transaction type
    Recurring : recurring, is_recurring, repeat
    Frequency : frequency, recurring_frequency, freq
    """
    reader = csv.DictReader(text.splitlines())
    rows = []
    for r in reader:
        keys = {k.strip().lower(): v for k, v in r.items()}

        date_key      = _find_csv_key(keys, 'date')
        desc_key      = _find_csv_key(keys, 'desc', 'narrat', 'particular',
                                      'remark', 'detail', 'memo', 'merchant',
                                      'payee', 'vendor', 'name')
        amount_key    = _find_csv_key(keys, 'amount', 'amt', 'debit', 'credit',
                                      'withdrawal', 'deposit', 'inr', 'sum', 'value')
        merchant_key  = _find_csv_key(keys, 'merchant', 'payee', 'vendor')
        category_key  = _find_csv_key(keys, 'category', 'cat', 'type')
        recurring_key = _find_csv_key(keys, 'recurring', 'is_recurring', 'repeat')
        frequency_key = _find_csv_key(keys, 'frequency', 'recurring_frequency', 'freq')

        if not date_key or not amount_key:
            continue

        raw_date = keys.get(date_key, '').strip()

        # Try all amount-like columns in order; use first non-zero value
        _amount_keywords = ('amount', 'amt', 'debit', 'credit', 'withdrawal', 'deposit', 'inr', 'sum', 'value')
        amount_candidates = [k for k in keys if any(kw in k for kw in _amount_keywords)]
        amount = 0.0
        for cand in amount_candidates:
            cleaned = re.sub(r'[^\d.]', '', (keys.get(cand) or '').replace(',', ''))
            try:
                val = float(cleaned) if cleaned else 0.0
            except Exception:
                val = 0.0
            if val != 0.0:
                amount = val
                break

        try:
            parsed_date = try_parse_date(raw_date)
        except Exception:
            continue

        if amount == 0.0:
            continue

        description = (keys.get(desc_key) or '').strip() if desc_key else ''
        merchant    = (keys.get(merchant_key) or '').strip() if merchant_key and merchant_key != desc_key else None
        category    = (keys.get(category_key) or '').strip() if category_key else 'uncategorized'

        # Parse recurring flag
        raw_recurring = (keys.get(recurring_key) or '').strip().lower() if recurring_key else ''
        is_recurring = raw_recurring in _RECURRING_TRUTHY

        # Parse frequency (only meaningful when recurring)
        raw_freq = (keys.get(frequency_key) or '').strip().lower() if frequency_key else ''
        recurring_frequency = raw_freq if raw_freq in _VALID_FREQUENCIES else None
        if not is_recurring:
            recurring_frequency = None

        rows.append({
            'date': parsed_date,
            'description': description,
            'merchant': merchant,
            'amount': amount,
            'category': category if category else 'uncategorized',
            'is_recurring': is_recurring,
            'recurring_frequency': recurring_frequency,
        })
    return rows


# ── PDF parsing ────────────────────────────────────────────────────────────

_DATE_RE = re.compile(
    r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}|'
    r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|'
    r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b',
    re.IGNORECASE,
)
_AMOUNT_RE = re.compile(r'[\$£€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2})')

_HEADER_DATE     = {'date', 'transaction date', 'trans date', 'posting date', 'post date', 'value date'}
_HEADER_DESC     = {'description', 'desc', 'narrative', 'narration', 'narrat', 'details', 'transaction', 'memo', 'particulars', 'remarks'}
_HEADER_AMOUNT   = {'amount', 'amt', 'debit', 'credit', 'withdrawal', 'deposit', 'sum', 'value'}
_HEADER_MERCHANT = {'merchant', 'payee', 'vendor', 'name'}
_HEADER_CATEGORY = {'category', 'cat', 'type', 'transaction type'}

# Map external/PDF category names → predefined categories
_PDF_CATEGORY_MAP: Dict[str, str] = {
    'food delivery': 'Food & Dining',
    'food & beverage': 'Food & Dining',
    'food and beverage': 'Food & Dining',
    'groceries': 'Food & Dining',
    'grocery': 'Food & Dining',
    'utilities': 'Bills & Utilities',
    'utility': 'Bills & Utilities',
    'health': 'Healthcare',
    'medical': 'Healthcare',
    'bills': 'Bills & Utilities',
    'personal care': 'Personal Care',
    'savings': 'Investments & Savings',
    'investment': 'Investments & Savings',
}


def normalize_pdf_category(raw: str) -> str:
    """Map a PDF/bank category string to one of the predefined categories."""
    from .categorizer import PREDEFINED_CATEGORIES
    stripped = raw.strip()
    if stripped in PREDEFINED_CATEGORIES:
        return stripped
    lower = stripped.lower()
    if lower in _PDF_CATEGORY_MAP:
        return _PDF_CATEGORY_MAP[lower]
    for cat in PREDEFINED_CATEGORIES:
        if cat.lower() in lower or lower in cat.lower():
            return cat
    return 'uncategorized'


def _clean_amount(raw: str) -> Optional[float]:
    """Strip currency symbols, spaces, and non-numeric junk then return absolute float."""
    # Remove everything that isn't a digit, dot, or comma
    cleaned = re.sub(r'[^\d.,]', '', raw)
    cleaned = cleaned.replace(',', '')
    if not cleaned:
        return None
    try:
        return abs(float(cleaned))
    except ValueError:
        return None


def _col_index(headers: List[str], candidates: set) -> Optional[int]:
    # Prefer exact match, then fall back to substring (header contains a candidate keyword)
    for i, h in enumerate(headers):
        if h.strip().lower() in candidates:
            return i
    for i, h in enumerate(headers):
        h_lower = h.strip().lower()
        if any(c in h_lower for c in candidates):
            return i
    return None


# Rows to skip — not real transactions
_SKIP_DESCRIPTIONS = {
    'opening balance', 'closing balance', 'brought forward', 'carried forward',
}

# Regex for flat rows: "DD-Mon-YYYY Description debit_or_dash credit_or_dash balance"
_FLAT_ROW_RE = re.compile(
    r'^(\d{1,2}[\/\-\s][A-Za-z]+[\/\-\s]\d{2,4})\s+'
    r'(.+?)\s+'
    r'([\d,]+\.?\d*|-)\s+'
    r'([\d,]+\.?\d*|-)\s+'
    r'([\d,]+\.?\d*)$'
)


def _is_flat_table(table: List[List]) -> bool:
    """True when pdfplumber merged all columns into one string per row."""
    return bool(table and table[0] and len(table[0]) == 1 and isinstance(table[0][0], str))


def _parse_flat_table_rows(table: List[List]) -> List[Dict]:
    """Parse tables where every row is a single merged string (no cell borders detected)."""
    rows = []
    for row in table[1:]:
        if not row or not row[0]:
            continue
        text = str(row[0]).strip()
        m = _FLAT_ROW_RE.match(text)
        if not m:
            continue
        date_str, desc, debit_str, credit_str, _ = m.groups()

        if desc.strip().lower() in _SKIP_DESCRIPTIONS:
            continue

        try:
            parsed_date = try_parse_date(date_str.strip())
        except Exception:
            continue

        # Use debit if available, otherwise credit (income)
        amount = None
        if debit_str != '-':
            amount = _clean_amount(debit_str)
        elif credit_str != '-':
            amount = _clean_amount(credit_str)

        if not amount:
            continue

        rows.append({
            'date': parsed_date,
            'description': desc.strip(),
            'merchant': None,
            'amount': amount,
            'category': 'uncategorized',
        })
    return rows


def _parse_table_rows(table: List[List]) -> List[Dict]:
    if not table or len(table) < 2:
        return []

    # Flat table: all columns merged into one string per row
    if _is_flat_table(table):
        return _parse_flat_table_rows(table)

    headers = [str(c or '').strip().lower() for c in table[0]]
    date_i     = _col_index(headers, _HEADER_DATE)
    desc_i     = _col_index(headers, _HEADER_DESC)
    amount_i   = _col_index(headers, _HEADER_AMOUNT)
    merchant_i = _col_index(headers, _HEADER_MERCHANT)
    category_i = _col_index(headers, _HEADER_CATEGORY)

    # Detect explicit Debit + Credit column pairs first; they take priority over a
    # single amount column because 'debit (inr)' would otherwise match via substring.
    debit_i = credit_i = None
    for i, h in enumerate(headers):
        hl = h.strip().lower()
        if any(kw in hl for kw in ('debit', 'withdrawal', ' dr')) and debit_i is None:
            debit_i = i
        elif any(kw in hl for kw in ('credit', 'deposit', ' cr')) and credit_i is None:
            credit_i = i

    if debit_i is not None and credit_i is not None:
        amount_i = None  # use split mode; ignore any single-amount column
    else:
        debit_i = credit_i = None  # no clean split — keep amount_i

    if date_i is None or (amount_i is None and debit_i is None and credit_i is None):
        return []

    rows = []
    for row in table[1:]:
        if not row or all(c is None or str(c).strip() == '' for c in row):
            continue
        try:
            raw_date = str(row[date_i] or '').strip()
            parsed_date = try_parse_date(raw_date)
        except Exception:
            continue

        # Resolve amount from single column or debit/credit pair
        if amount_i is not None:
            amount = _clean_amount(str(row[amount_i] or ''))
        else:
            debit_val  = _clean_amount(str(row[debit_i] or ''))  if debit_i  is not None else None
            credit_val = _clean_amount(str(row[credit_i] or '')) if credit_i is not None else None
            amount = debit_val or credit_val

        if not amount or amount == 0.0:
            continue

        merchant = str(row[merchant_i] or '').strip() if merchant_i is not None else None
        description = str(row[desc_i] or '').strip() if desc_i is not None else (merchant or '')

        if description.lower() in _SKIP_DESCRIPTIONS:
            continue

        raw_cat = str(row[category_i] or '').strip() if category_i is not None else ''
        category = normalize_pdf_category(raw_cat) if raw_cat else 'uncategorized'

        rows.append({
            'date': parsed_date,
            'description': description,
            'merchant': merchant,
            'amount': amount,
            'category': category,
        })
    return rows


def _parse_text_lines(text: str) -> List[Dict]:
    """Last-resort: scan raw text lines for date + amount pairs."""
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        date_match = _DATE_RE.search(line)
        if not date_match:
            continue
        try:
            parsed_date = try_parse_date(date_match.group(0))
        except Exception:
            continue
        amounts = _AMOUNT_RE.findall(line)
        if not amounts:
            continue
        try:
            amount = abs(float(amounts[-1].replace(',', '')))
        except Exception:
            continue
        # description = everything between the date and the last amount
        desc_part = line[date_match.end():].strip()
        desc_part = _AMOUNT_RE.sub('', desc_part).strip(' ,-|')
        rows.append({
            'date': parsed_date,
            'description': desc_part,
            'merchant': None,
            'amount': amount,
            'category': 'uncategorized',
        })
    return rows


def _is_scanned_pdf(content: bytes) -> bool:
    """Return True when pdfplumber cannot find any embedded text."""
    import pdfplumber
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            if words:
                return False
    return True


def _parse_with_vision(content: bytes) -> List[Dict]:
    """Use GPT-4o Vision to extract transactions from scanned / image-based PDFs.

    All pages are sent in a single API call to avoid per-page round-trip latency.
    """
    import os, base64, json
    from openai import OpenAI
    from pdf2image import convert_from_bytes

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return []

    images = convert_from_bytes(content, dpi=200)

    image_blocks = []
    for img in images:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        b64 = base64.b64encode(buf.getvalue()).decode()
        image_blocks.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
        })

    if not image_blocks:
        return []

    from .categorizer import PREDEFINED_CATEGORIES
    categories_str = ", ".join(f'"{c}"' for c in PREDEFINED_CATEGORIES)

    prompt = (
        "These are pages from a bank statement. Extract every financial transaction across all pages.\n"
        "Return ONLY a JSON array (no markdown, no explanation) like:\n"
        '[{"date":"YYYY-MM-DD","description":"...","amount":1234.56,"type":"debit","category":"Food & Dining"}]\n\n'
        "Rules:\n"
        "- Skip summary rows: Opening/Closing Balance, Balance Brought Forward, "
        "Transaction Turnover, Transaction Count.\n"
        "- Convert all dates to YYYY-MM-DD.\n"
        "- amount must be a positive number.\n"
        "- type: 'debit' for withdrawals/payments, 'credit' for deposits/receipts.\n"
        f"- category must be exactly one of: {categories_str}.\n"
        "- Zomato/Swiggy → Food & Dining. Ola/Uber → Transportation. "
        "Jio/Airtel → Bills & Utilities. Netflix/Hotstar → Entertainment. "
        "Salary/NEFT credit → Income. SIP/Mutual Fund → Investments & Savings.\n"
        "- If a page has no transactions, skip it.\n"
        "- Return [] if no transactions found."
    )

    client = OpenAI(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": [{"type": "text", "text": prompt}] + image_blocks,
            }]
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'^```[a-z]*\n?', '', raw).rstrip('`').strip()
        transactions = json.loads(raw)
        if not isinstance(transactions, list):
            return []
    except Exception:
        return []

    rows: List[Dict] = []
    from .categorizer import PREDEFINED_CATEGORIES
    for tx in transactions:
        try:
            parsed_date = try_parse_date(str(tx.get("date", "")))
            amount = abs(float(tx.get("amount", 0)))
            if not amount:
                continue
            desc = str(tx.get("description", "")).strip()
            if not desc:
                continue
            cat = str(tx.get("category", "")).strip()
            if cat not in PREDEFINED_CATEGORIES:
                cat = "uncategorized"
            rows.append({
                "date": parsed_date,
                "description": desc,
                "merchant": None,
                "amount": amount,
                "category": cat,
            })
        except Exception:
            continue

    return rows


def parse_pdf_statement(content: bytes) -> List[Dict]:
    """Extract transactions from a bank statement PDF.

    Strategy (in order):
    1. pdfplumber structured table extraction  (text-based PDFs with borders)
    2. pdfplumber raw text + regex            (text-based PDFs without borders)
    3. GPT-4o Vision                          (scanned / image-based PDFs)
    """
    import pdfplumber

    # ── Strategy 1 & 2: pdfplumber (text-based PDFs) ─────────────────────────
    rows: List[Dict] = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                rows.extend(_parse_table_rows(table))

        if not rows:
            full_text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
            rows = _parse_text_lines(full_text)

    if rows:
        return rows

    # ── Strategy 3: GPT-4o Vision (scanned PDFs) ─────────────────────────────
    return _parse_with_vision(content)
