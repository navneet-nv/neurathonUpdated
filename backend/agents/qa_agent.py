import json
import os
import time
from typing import Any, Dict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI


load_dotenv()


# region debug-log
def _debug_log(hypothesis_id: str, location: str, message: str, data: Dict[str, Any]) -> None:
  try:
      payload = {
          "sessionId": "f612a6",
          "runId": "pre-fix",
          "hypothesisId": hypothesis_id,
          "location": location,
          "message": message,
          "data": data,
          "timestamp": int(time.time() * 1000),
      }
      with open("debug-f612a6.log", "a", encoding="utf-8") as f:
          f.write(json.dumps(payload) + "\n")
  except Exception:
      # Logging must never break the agent
      pass


# endregion


def run_qa_agent(question: str, context: Dict[str, Any]) -> Dict[str, str]:
    """
    Lightweight participant Q&A helper that answers questions
    using only the provided event context.

    Returns a dict with a single key:
    { "answer": "<string>" }
    """
    event_name = context.get("event_name", "") or "this event"
    schedule = context.get("schedule", []) or []
    generated_posts = context.get("generated_posts", {}) or {}

    try:
        _debug_log(
            "H1",
            "qa_agent.py:24",
            "run_qa_agent entered",
            {
                "has_openai_key": bool(os.getenv("OPENAI_API_KEY")),
                "event_name": event_name,
                "schedule_len": len(schedule),
            },
        )

        llm = ChatOpenAI(model="gpt-4o")

        schedule_snippet = json.dumps(schedule, indent=2) if schedule else "[]"
        posts_snippet = json.dumps(generated_posts, indent=2) if generated_posts else "{}"

        system_prompt = (
            f"You are a helpful event assistant for {event_name}. "
            "Answer participant questions using only the provided event context. "
            "Be concise, friendly, and practical.\n\n"
            "If the answer cannot be determined strictly from the context, "
            'respond exactly with: "I don\'t have that information yet. Please check back later."'
        )

        user_prompt = (
            "Here is the current event context:\n\n"
            f"Schedule JSON:\n{schedule_snippet}\n\n"
            f"Generated posts / metadata JSON:\n{posts_snippet}\n\n"
            "Participant question:\n"
            f"{question}\n\n"
            "First, think silently about whether the question can be answered using ONLY this context.\n"
            "Then, respond with a short, direct answer (1–3 sentences).\n"
            "If it cannot be answered from the context, respond exactly with:\n"
            '"I don\'t have that information yet. Please check back later."'
        )

        combined_prompt = f"{system_prompt}\n\nUser request:\n{user_prompt}"

        _debug_log(
            "H2",
            "qa_agent.py:52",
            "invoking ChatOpenAI",
            {"prompt_length": len(combined_prompt)},
        )

        response = llm.invoke(combined_prompt)
        content = getattr(response, "content", "") or ""

        if isinstance(content, list):
            content = " ".join(str(chunk) for chunk in content)

        answer = str(content).strip()

        if not answer:
            answer = "I don't have that information yet. Please check back later."

        _debug_log(
            "H3",
            "qa_agent.py:62",
            "run_qa_agent success",
            {"answer_preview": answer[:80]},
        )

        return {"answer": answer}
    except Exception as e:
        _debug_log(
            "H4",
            "qa_agent.py:68",
            "run_qa_agent exception",
            {"error_type": type(e).__name__, "error_message": str(e)[:200]},
        )
        return {
            "answer": f"Sorry, something went wrong while answering your question: {e}"
        }

