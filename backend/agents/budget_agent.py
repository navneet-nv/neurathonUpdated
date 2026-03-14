"""Budget Tracking Agent — GPT-4o-powered expense analysis and categorisation."""

import os, json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

CATEGORIES = [
    "Venue", "Catering", "Tech", "Marketing",
    "Prizes", "Transport", "Accommodation", "Misc"
]


def run_budget_agent(
    event_name: str,
    expenses: list,
    total_budget: float,
    allocations: dict,
    instruction: str = "",
) -> dict:
    """Analyse current spend vs allocations, identify overruns, suggest reallocation."""

    spent_by_cat = {}
    for e in expenses:
        cat = e.get("category", "Misc")
        spent_by_cat[cat] = spent_by_cat.get(cat, 0) + e.get("amount", 0)

    total_spent = sum(e.get("amount", 0) for e in expenses)

    prompt_data = {
        "event_name": event_name,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "allocations": allocations,
        "spent_by_category": spent_by_cat,
        "expense_count": len(expenses),
        "instruction": instruction,
    }

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    messages = [
        SystemMessage(content=(
            "You are an expert event budget analyst. "
            "Analyse the budget data provided and return a JSON object with exactly these keys:\n"
            '{"insights": "markdown summary of budget health", '
            '"alerts": ["list of overrun warnings"], '
            '"suggestions": ["list of reallocation ideas"]}\n'
            "Be concise: max 6 sentences for insights, max 5 alerts, max 5 suggestions. "
            "Return ONLY the raw JSON, no markdown fences."
        )),
        HumanMessage(content=json.dumps(prompt_data, default=str)),
    ]
    resp = llm.invoke(messages)
    text = resp.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text.strip())
    except Exception:
        return {"insights": text[:500], "alerts": [], "suggestions": []}


def auto_categorise_expense(description: str, amount: float) -> str:
    """Use GPT-4o to classify an expense into one of the predefined categories."""

    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    messages = [
        SystemMessage(content=(
            f"Classify this expense into EXACTLY one of: {', '.join(CATEGORIES)}. "
            "Return ONLY the category name, nothing else."
        )),
        HumanMessage(content=f"Expense: {description} — Amount: {amount}"),
    ]
    resp = llm.invoke(messages)
    cat = resp.content.strip()
    # Fuzzy match to valid category
    for c in CATEGORIES:
        if c.lower() in cat.lower():
            return c
    return "Misc"
