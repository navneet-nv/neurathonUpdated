from copy import deepcopy
from datetime import datetime
from typing import Any, Dict

from langgraph.graph import END, START, StateGraph

from agents.content_agent import run_content_agent
from agents.email_agent import run_email_agent
from agents.scheduler_agent import run_scheduler_agent
from agents.qa_agent import run_qa_agent
from state import SwarmState


def _now_iso() -> str:
    return datetime.now().isoformat()


def _append_log(
    state: SwarmState,
    agent: str,
    status: str,
    summary: str,
) -> None:
    state["activity_log"].append(
        {
            "agent": agent,
            "status": status,
            "timestamp": _now_iso(),
            "summary": summary,
        }
    )


def content_node(state: SwarmState) -> SwarmState:
    new_state: SwarmState = deepcopy(state)
    _append_log(new_state, "content", "running", "Starting content generation.")

    try:
        result: Dict[str, Any] = run_content_agent(
            event_name=new_state["event_name"],
            raw_text=new_state["raw_text"],
            target_audience=new_state["target_audience"],
        )
        new_state["generated_posts"] = result
        new_state["last_agent"] = "content"

        status = result.get("status", "success")
        _append_log(
            new_state,
            "content",
            "success",
            f"Content agent completed with status={status}.",
        )
    except Exception as e:
        _append_log(
            new_state,
            "content",
            "error",
            f"Error in content agent: {e}",
        )

    return new_state


def scheduler_node(state: SwarmState) -> SwarmState:
    new_state: SwarmState = deepcopy(state)
    _append_log(new_state, "scheduler", "running", "Starting schedule analysis.")

    try:
        result: Dict[str, Any] = run_scheduler_agent(new_state["events"])

        # Prefer resolved schedule when available
        schedule = result.get("resolved_schedule") or result.get("original_schedule") or new_state["events"]
        changes = result.get("changes_made", [])

        conflict_count = 0
        if "conflicts_found" in result:
            try:
                conflict_count = int(result.get("conflicts_found", 0) or 0)
            except (TypeError, ValueError):
                conflict_count = 0
        elif result.get("had_conflicts"):
            conflict_count = 1

        new_state["schedule"] = schedule
        new_state["changes"] = changes
        new_state["conflicts_found"] = conflict_count > 0
        new_state["last_agent"] = "scheduler"

        _append_log(
            new_state,
            "scheduler",
            "success",
            f"Scheduler agent completed. conflicts_found={new_state['conflicts_found']}.",
        )
    except Exception as e:
        new_state["conflicts_found"] = False
        _append_log(
            new_state,
            "scheduler",
            "error",
            f"Error in scheduler agent: {e}",
        )

    return new_state


def email_node(state: SwarmState) -> SwarmState:
    new_state: SwarmState = deepcopy(state)
    _append_log(new_state, "email", "running", "Starting email preparation.")

    try:
        # Reuse existing CSV parsing logic from the email endpoint
        from tools.csv_parser import parse_participants

        participants_data = parse_participants(new_state["csv_path"])

        result: Dict[str, Any] = run_email_agent(
            participants_data,
            new_state["email_template"],
        )
        new_state["email_results"] = result
        new_state["last_agent"] = "email"

        status = result.get("status", "success")
        total = result.get("total_processed", 0)
        _append_log(
            new_state,
            "email",
            "success",
            f"Email agent prepared {total} emails with status={status}.",
        )
    except Exception as e:
        _append_log(
            new_state,
            "email",
            "error",
            f"Error in email agent: {e}",
        )

    return new_state


def qa_node(state: SwarmState) -> SwarmState:
  """
  Standalone Q&A node that can answer participant questions
  using the current swarm state as context.
  This node is not wired into the main swarm flow and is
  intended to be called directly when needed.
  """
  new_state: SwarmState = deepcopy(state)

  question = ""
  try:
      # Find the most recent user-style message if present
      messages = new_state.get("messages", []) or []
      if messages:
          last = messages[-1]
          question = last.get("content", "") or last.get("text", "") or ""
  except Exception:
      question = ""

  context = {
      "event_name": new_state.get("event_name", ""),
      "schedule": new_state.get("schedule", []),
      "generated_posts": new_state.get("generated_posts", {}),
  }

  if question:
      qa_result: Dict[str, Any] = run_qa_agent(question, context)
      answer = qa_result.get("answer", "")
      new_state.setdefault("messages", [])
      new_state["messages"].append(
          {
              "role": "assistant",
              "agent": "qa",
              "content": answer,
              "timestamp": _now_iso(),
          }
      )

  return new_state


def _scheduler_decision(state: SwarmState) -> str:
    """
    Decide whether to proceed to the email node or end the swarm.
    """
    return "email" if state.get("conflicts_found") else "end"


graph = StateGraph(SwarmState)

graph.add_node("content", content_node)
graph.add_node("scheduler", scheduler_node)
graph.add_node("email", email_node)
graph.add_node("qa", qa_node)

graph.add_edge(START, "content")
graph.add_edge("content", "scheduler")

graph.add_conditional_edges(
    "scheduler",
    _scheduler_decision,
    {
        "email": "email",
        "end": END,
    },
)

graph.add_edge("email", END)

swarm_app = graph.compile()

