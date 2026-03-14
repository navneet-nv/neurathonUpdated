"""Logistics Tracking Agent — GPT-4o-powered readiness assessment and issue resolution."""

import os, json
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()


def run_logistics_agent(
    event_name: str,
    items: list,
    issues: list,
    rooms: list,
    instruction: str = "",
) -> dict:
    """Assess event readiness, flag risks, and suggest actions."""

    pending = [i for i in items if i.get("status", "").lower() in ("pending", "in transit")]
    open_issues = [i for i in issues if i.get("status", "").lower() != "resolved"]

    prompt_data = {
        "event_name": event_name,
        "total_items": len(items),
        "pending_items": len(pending),
        "open_issues": len(open_issues),
        "rooms": rooms,
        "pending_details": pending[:10],
        "issue_details": open_issues[:10],
        "instruction": instruction,
    }

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    messages = [
        SystemMessage(content=(
            "You are an expert event logistics coordinator. "
            "Assess readiness and return a JSON object with exactly these keys:\n"
            '{"readiness_score": 0-100, "risks": ["list of risk descriptions"], '
            '"actions": ["list of immediate action items"]}\n'
            "Be concise: max 5 risks, max 5 actions. "
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
        return {"readiness_score": 0, "risks": [text[:300]], "actions": []}


def suggest_issue_resolution(
    issue_description: str,
    room: str,
    severity: str,
) -> dict:
    """Call GPT-4o to suggest resolution steps for a reported issue."""

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    messages = [
        SystemMessage(content=(
            "You are an event operations expert. A logistics issue was reported. "
            "Suggest concrete resolution steps. Return a JSON object:\n"
            '{"steps": ["step 1", "step 2", ...], "estimated_time": "e.g. 30 minutes"}\n'
            "Max 5 steps. Return ONLY raw JSON, no markdown."
        )),
        HumanMessage(content=(
            f"Issue: {issue_description}\nRoom: {room}\nSeverity: {severity}"
        )),
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
        return {"steps": [text[:300]], "estimated_time": "unknown"}
