import os
from typing import Optional, List
from sqlmodel import Session, select, col

PREDEFINED_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Travel",
    "Education",
    "Personal Care",
    "Home",
    "Transfers",
    "Miscellaneous",
]

_KEYWORD_FALLBACK = {
    # ── Food & Dining ──────────────────────────────────────────────────────
    "zomato": "Food & Dining",
    "swiggy": "Food & Dining",
    "bigbasket": "Food & Dining",
    "blinkit": "Food & Dining",
    "instamart": "Food & Dining",
    "dunzo": "Food & Dining",
    "doordash": "Food & Dining",
    "grubhub": "Food & Dining",
    "ubereats": "Food & Dining",
    "restaurant": "Food & Dining",
    "cafe": "Food & Dining",
    "coffee": "Food & Dining",
    "biryani": "Food & Dining",
    "pizza": "Food & Dining",
    "burger": "Food & Dining",
    "lunch": "Food & Dining",
    "dinner": "Food & Dining",
    "breakfast": "Food & Dining",
    "mcdonald": "Food & Dining",
    "starbucks": "Food & Dining",
    "domino": "Food & Dining",
    "kfc": "Food & Dining",
    "grocery": "Food & Dining",
    "supermarket": "Food & Dining",
    "haldiram": "Food & Dining",
    "chai": "Food & Dining",
    # ── Transportation ─────────────────────────────────────────────────────
    "uber": "Transportation",
    "ola": "Transportation",
    "rapido": "Transportation",
    "lyft": "Transportation",
    "cab": "Transportation",
    "taxi": "Transportation",
    "auto rickshaw": "Transportation",
    "metro": "Transportation",
    "bus ticket": "Transportation",
    "petrol": "Transportation",
    "fuel": "Transportation",
    "gas station": "Transportation",
    "parking": "Transportation",
    "fastag": "Transportation",
    "toll": "Transportation",
    # ── Travel ─────────────────────────────────────────────────────────────
    "flight": "Travel",
    "airline": "Travel",
    "indigo": "Travel",
    "air india": "Travel",
    "spicejet": "Travel",
    "vistara": "Travel",
    "irctc": "Travel",
    "train ticket": "Travel",
    "hotel": "Travel",
    "airbnb": "Travel",
    "oyo": "Travel",
    "makemytrip": "Travel",
    "goibibo": "Travel",
    "booking.com": "Travel",
    "expedia": "Travel",
    # ── Shopping ───────────────────────────────────────────────────────────
    "amazon": "Shopping",
    "flipkart": "Shopping",
    "myntra": "Shopping",
    "ajio": "Shopping",
    "meesho": "Shopping",
    "snapdeal": "Shopping",
    "walmart": "Shopping",
    "target": "Shopping",
    "bestbuy": "Shopping",
    "decathlon": "Shopping",
    "ikea": "Shopping",
    "headphone": "Shopping",
    "laptop": "Shopping",
    "mobile": "Shopping",
    "clothing": "Shopping",
    # ── Entertainment ──────────────────────────────────────────────────────
    "netflix": "Entertainment",
    "amazon prime": "Entertainment",
    "hotstar": "Entertainment",
    "disney": "Entertainment",
    "spotify": "Entertainment",
    "jiocinema": "Entertainment",
    "zee5": "Entertainment",
    "hulu": "Entertainment",
    "youtube premium": "Entertainment",
    "bookmyshow": "Entertainment",
    "pvr": "Entertainment",
    "inox": "Entertainment",
    "cinema": "Entertainment",
    "movie": "Entertainment",
    # ── Bills & Utilities ──────────────────────────────────────────────────
    "electricity": "Bills & Utilities",
    "bescom": "Bills & Utilities",
    "mseb": "Bills & Utilities",
    "tneb": "Bills & Utilities",
    "water bill": "Bills & Utilities",
    "bwssb": "Bills & Utilities",
    "gas bill": "Bills & Utilities",
    "jio": "Bills & Utilities",
    "airtel": "Bills & Utilities",
    "vodafone": "Bills & Utilities",
    "vi mobile": "Bills & Utilities",
    "bsnl": "Bills & Utilities",
    "recharge": "Bills & Utilities",
    "internet": "Bills & Utilities",
    "broadband": "Bills & Utilities",
    "tata sky": "Bills & Utilities",
    "dish tv": "Bills & Utilities",
    "insurance": "Bills & Utilities",
    "lic": "Bills & Utilities",
    "phone bill": "Bills & Utilities",
    # ── Healthcare ─────────────────────────────────────────────────────────
    "apollo": "Healthcare",
    "medplus": "Healthcare",
    "1mg": "Healthcare",
    "netmeds": "Healthcare",
    "practo": "Healthcare",
    "pharmacy": "Healthcare",
    "doctor": "Healthcare",
    "hospital": "Healthcare",
    "clinic": "Healthcare",
    "dental": "Healthcare",
    "medicines": "Healthcare",
    "diagnostic": "Healthcare",
    # ── Personal Care ──────────────────────────────────────────────────────
    "gym": "Personal Care",
    "cult fit": "Personal Care",
    "fitpass": "Personal Care",
    "salon": "Personal Care",
    "spa": "Personal Care",
    "nykaa": "Personal Care",
    "mamaearth": "Personal Care",
    "haircut": "Personal Care",
    # ── Education ──────────────────────────────────────────────────────────
    "udemy": "Education",
    "coursera": "Education",
    "school": "Education",
    "university": "Education",
    "tuition": "Education",
    "byju": "Education",
    "unacademy": "Education",
    "upgrad": "Education",
    "course": "Education",
    # ── Home ───────────────────────────────────────────────────────────────
    "rent": "Home",
    "mortgage": "Home",
    "furniture": "Home",
    "maintenance": "Home",
    "house": "Home",
    # ── Investments (mapped to Transfers — money moving to investment accounts) ──
    "zerodha": "Transfers",
    "groww": "Transfers",
    "mutual fund": "Transfers",
    "sip": "Transfers",
    "investment": "Transfers",
    "brokerage": "Transfers",
    "401k": "Transfers",
    # ── Transfers ──────────────────────────────────────────────────────────
    "transfer": "Transfers",
    "upi": "Transfers",
    "neft": "Transfers",
    "imps": "Transfers",
    "zelle": "Transfers",
    "venmo": "Transfers",
    "paytm": "Transfers",
    "gpay": "Transfers",
    "phonepe": "Transfers",
}


def _keyword_fallback(text: str) -> Optional[str]:
    lower = text.lower()
    for kw, cat in _KEYWORD_FALLBACK.items():
        if kw in lower:
            return cat
    return None


def apply_keyword_rules(session: Session, description: str, merchant: Optional[str]) -> Optional[str]:
    from ..models import CategoryRule
    rules = session.exec(
        select(CategoryRule).order_by(col(CategoryRule.priority).desc())
    ).all()
    combined = f"{description} {merchant or ''}".lower()
    for rule in rules:
        if rule.keyword.lower() in combined:
            return rule.category
    return None


def check_merchant_mapping(session: Session, merchant: Optional[str]) -> Optional[str]:
    if not merchant:
        return None
    from ..models import MerchantMapping
    normalized = merchant.lower().strip()
    mapping = session.exec(
        select(MerchantMapping).where(MerchantMapping.merchant == normalized)
    ).first()
    return mapping.category if mapping else None


def _get_recent_feedback_examples(session: Session, limit: int = 10) -> List[dict]:
    from ..models import CategoryFeedback
    feedbacks = session.exec(
        select(CategoryFeedback).order_by(col(CategoryFeedback.created_at).desc()).limit(limit)
    ).all()
    return [
        {"description": f.description, "merchant": f.merchant, "category": f.new_category}
        for f in feedbacks
        if f.description or f.merchant
    ]


def ai_categorize(
    description: str,
    merchant: Optional[str],
    amount: float,
    feedback_examples: List[dict],
) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _keyword_fallback(f"{description} {merchant or ''}") or "Miscellaneous"

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        # Exclude Miscellaneous from the list shown to AI — it should generate a custom label instead
        predefined_for_ai = [c for c in PREDEFINED_CATEGORIES if c != "Miscellaneous"]
        categories_str = "\n".join(f"- {c}" for c in predefined_for_ai)

        examples_str = ""
        if feedback_examples:
            examples_str = "\n\nLearn from these recent user-corrected examples:\n"
            for ex in feedback_examples[:5]:
                merchant_part = f" at {ex['merchant']}" if ex.get("merchant") else ""
                examples_str += f"- \"{ex.get('description', '')}{merchant_part}\" → {ex['category']}\n"

        merchant_part = f"\nMerchant: {merchant}" if merchant else ""

        prompt = (
            f"You are an expense categorisation assistant for Indian users. "
            f"Categorise the transaction below into exactly one of these predefined categories:\n{categories_str}"
            f"{examples_str}\n\n"
            f"Transaction:\nDescription: {description}{merchant_part}\nAmount: ₹{amount:.2f}\n\n"
            f"Rules:\n"
            f"- Food delivery apps (Zomato, Swiggy) → Food & Dining\n"
            f"- Ride-hailing apps (Ola, Uber, Rapido) → Transportation\n"
            f"- Telecom recharges (Jio, Airtel) → Bills & Utilities\n"
            f"- Streaming services (Netflix, Hotstar) → Entertainment\n"
            f"- If the transaction clearly fits a predefined category, return that category name exactly.\n"
            f"- If it does NOT fit any predefined category, invent a concise descriptive category "
            f"(2-4 words, Title Case) that precisely describes this expense. "
            f"Examples: 'Pet Care', 'Gifts & Donations', 'Charitable Giving', 'Office Supplies', 'Sports Equipment'.\n"
            f"- NEVER return 'Other', 'Miscellaneous', or 'Uncategorized'.\n"
            f"- Reply with ONLY the category name, nothing else."
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=30,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.choices[0].message.content.strip().strip('"').strip("'")

        # If AI returned a predefined category, use it
        if result in PREDEFINED_CATEGORIES:
            return result
        lower = result.lower()
        for cat in PREDEFINED_CATEGORIES:
            if cat.lower() == lower:
                return cat
        # Fuzzy match to predefined (but not Miscellaneous)
        for cat in predefined_for_ai:
            if cat.lower() in lower or lower in cat.lower():
                return cat

        # AI returned a custom descriptive label — return it as-is
        # The UI will show it alongside a "Miscellaneous" secondary tag
        if result and result.lower() not in ("other", "miscellaneous", "uncategorized", "unknown"):
            return result

        return "Miscellaneous"

    except Exception:
        return _keyword_fallback(f"{description} {merchant or ''}") or "Miscellaneous"


def categorize_transaction(
    session: Session,
    description: str,
    merchant: Optional[str],
    amount: float,
) -> str:
    # Priority 1: user-defined keyword rules (FR022)
    rule_cat = apply_keyword_rules(session, description, merchant)
    if rule_cat:
        return rule_cat

    # Priority 2: merchant mapping — learned from corrections (FR024, FR023)
    merchant_cat = check_merchant_mapping(session, merchant)
    if merchant_cat:
        return merchant_cat

    # Priority 3: AI with in-context feedback examples (FR020, FR023)
    feedback_examples = _get_recent_feedback_examples(session)
    return ai_categorize(description, merchant, amount, feedback_examples)


def batch_categorize(
    session: Session,
    rows: List[dict],
) -> List[str]:
    """Categorise multiple rows in a single API call instead of one call per row.

    Each item in rows must have keys: description, merchant, amount.
    Returns a list of category strings in the same order.
    If the AI cannot match a predefined category, it returns a descriptive custom label.
    Custom labels are stored as-is; the UI shows them alongside a 'Miscellaneous' badge.
    """
    results = []
    needs_ai: List[int] = []  # indices that still need AI after keyword/merchant pass

    # Pass 1: keyword rules + merchant mapping (no API calls)
    for i, row in enumerate(rows):
        desc = row.get("description", "")
        merchant = row.get("merchant")

        cat = apply_keyword_rules(session, desc, merchant)
        if not cat:
            cat = check_merchant_mapping(session, merchant)
        if not cat:
            cat = _keyword_fallback(f"{desc} {merchant or ''}")

        results.append(cat)  # None means still needs AI
        if cat is None:
            needs_ai.append(i)

    if not needs_ai:
        return [r or "Miscellaneous" for r in results]

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        for i in needs_ai:
            results[i] = "Miscellaneous"
        return results

    # Pass 2: single batch API call for all remaining rows
    try:
        from openai import OpenAI
        import json

        client = OpenAI(api_key=api_key)
        predefined_for_ai = [c for c in PREDEFINED_CATEGORIES if c != "Miscellaneous"]
        categories_str = "\n".join(f"- {c}" for c in predefined_for_ai)
        feedback_examples = _get_recent_feedback_examples(session)

        examples_str = ""
        if feedback_examples:
            examples_str = "\nUser-corrected examples to learn from:\n"
            for ex in feedback_examples[:5]:
                mp = f" at {ex['merchant']}" if ex.get("merchant") else ""
                examples_str += f"- \"{ex.get('description','')}{mp}\" → {ex['category']}\n"

        transactions_str = ""
        for idx, i in enumerate(needs_ai):
            row = rows[i]
            mp = f", merchant: {row['merchant']}" if row.get("merchant") else ""
            transactions_str += f"{idx+1}. description: {row['description']}{mp}, amount: {row.get('amount',0):.0f}\n"

        prompt = (
            f"You are an expense categorisation assistant for Indian users.\n"
            f"Categorise each transaction into exactly one category.\n\n"
            f"Predefined categories (use these when they fit):\n{categories_str}\n"
            f"{examples_str}\n"
            f"Rules:\n"
            f"- Zomato/Swiggy → Food & Dining\n"
            f"- Ola/Uber/Rapido → Transportation\n"
            f"- Jio/Airtel recharges → Bills & Utilities\n"
            f"- Netflix/Hotstar → Entertainment\n"
            f"- If a transaction clearly fits a predefined category, use that exact name.\n"
            f"- If it does NOT fit any predefined category, invent a concise descriptive category "
            f"(2-4 words, Title Case). Examples: 'Pet Care', 'Gifts & Donations', 'Office Supplies'.\n"
            f"- NEVER return 'Other', 'Miscellaneous', or 'Uncategorized'.\n\n"
            f"Transactions to categorise:\n{transactions_str}\n"
            f"Reply with a JSON object like: {{\"categories\": [\"Food & Dining\", \"Pet Care\"]}}. "
            f"One entry per transaction, in the same order. Nothing else."
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            cats = next(iter(parsed.values()))
        else:
            cats = parsed

        for local_idx, global_idx in enumerate(needs_ai):
            cat = cats[local_idx] if local_idx < len(cats) else "Miscellaneous"
            cat = str(cat).strip().strip('"').strip("'")

            # Normalize: if AI returned something close to a predefined category, use the exact name
            if cat in PREDEFINED_CATEGORIES:
                results[global_idx] = cat
                continue
            lower = cat.lower()
            matched = next(
                (c for c in predefined_for_ai if c.lower() == lower or c.lower() in lower or lower in c.lower()),
                None
            )
            if matched:
                results[global_idx] = matched
            elif cat.lower() in ("other", "miscellaneous", "uncategorized", "unknown", ""):
                results[global_idx] = "Miscellaneous"
            else:
                # Keep the AI-generated custom descriptive label
                results[global_idx] = cat

    except Exception:
        for i in needs_ai:
            results[i] = _keyword_fallback(
                f"{rows[i].get('description','')} {rows[i].get('merchant') or ''}"
            ) or "Miscellaneous"

    return results
