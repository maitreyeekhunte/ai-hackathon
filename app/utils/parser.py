import csv
from datetime import datetime, date
from typing import List, Dict

COMMON_DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%d %b %Y"]

def try_parse_date(value: str) -> date:
    value = value.strip()
    # try ISO
    try:
        return date.fromisoformat(value)
    except Exception:
        pass
    for fmt in COMMON_DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except Exception:
            continue
    # fallback: try parsing day-first or month-first heuristics
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

def parse_csv_statement(text: str) -> List[Dict]:
    """Parse CSV text and return list of rows as dicts with keys: date, description, amount, category (optional)."""
    reader = csv.DictReader(text.splitlines())
    rows = []
    for r in reader:
        # normalize keys
        keys = {k.strip().lower(): v for k, v in r.items()}
        # find likely columns
        date_key = next((k for k in keys if 'date' in k), None)
        desc_key = next((k for k in keys if 'desc' in k or 'description' in k), None)
        amount_key = next((k for k in keys if 'amount' in k or 'amt' in k), None)
        category_key = next((k for k in keys if 'category' in k or 'cat' in k), None)
        if not date_key or not amount_key:
            continue
        raw_date = keys.get(date_key, '').strip()
        raw_amount = keys.get(amount_key, '').strip().replace(',', '')
        try:
            parsed_date = try_parse_date(raw_date)
            amount = float(raw_amount) if raw_amount else 0.0
        except Exception:
            continue
        rows.append({
            'date': parsed_date,
            'description': (keys.get(desc_key) or '').strip() if desc_key else '',
            'amount': amount,
            'category': (keys.get(category_key) or '').strip() if category_key else 'uncategorized'
        })
    return rows
