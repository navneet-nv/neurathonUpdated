import json
from typing import Any, Dict, List

from langchain_openai import ChatOpenAI

from tools.conflict_checker import check_conflicts


def _parse_json_response(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def run_scheduler_agent(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Detect and optionally resolve schedule conflicts using OpenAI.
    """
    try:
        conflicts = check_conflicts(events)
        conflict_count = len(conflicts)

        if conflict_count == 0:
            return {
                "status": "success",
                "conflicts_found": 0,
                "conflicts": [],
                "original_schedule": events,
                "resolved_schedule": events,
                "changes_made": [],
                "had_conflicts": False,
            }

        llm = ChatOpenAI(model="gpt-4o")

        system_prompt = (
            "You are an expert event scheduler. Think step by step.\n"
            "When resolving conflicts, consider:\n"
            "1. Shift the later event by 30-60 minutes\n"
            "2. Move to a different room if available\n"
            "3. Only cancel as a last resort.\n"
            "Always explain your reasoning for each resolution."
        )

        user_prompt = (
            "Here is the event schedule:\n"
            f"{json.dumps(events, indent=2)}\n\n"
            "These conflicts were detected:\n"
            f"{json.dumps(conflicts, indent=2)}\n\n"
            "Please resolve ALL conflicts. Think step by step.\n"
            "Return a JSON response with:\n"
            "{\n"
            "  'resolved_schedule': [full list of events with fixes applied],\n"
            "  'changes_made': [list of what was changed and why],\n"
            "  'unresolvable': [any conflicts that could not be fixed]\n"
            "}\n"
            "Use double quotes for JSON keys and string values."
        )

        combined_prompt = f"{system_prompt}\n\nUser request:\n{user_prompt}"

        response = llm.invoke(combined_prompt)
        content_text = getattr(response, "content", "") or ""
        if isinstance(content_text, list):
            content_text = " ".join(str(chunk) for chunk in content_text)

        parsed = _parse_json_response(str(content_text))

        resolved_schedule = parsed.get("resolved_schedule", events)
        changes_made = parsed.get("changes_made", [])

        return {
            "status": "success",
            "conflicts_found": conflict_count,
            "conflicts": conflicts,
            "original_schedule": events,
            "resolved_schedule": resolved_schedule,
            "changes_made": changes_made,
            "had_conflicts": True,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

