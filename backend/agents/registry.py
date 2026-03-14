"""Plug-in agent registry — maps agent names to their modules and functions."""

AGENT_REGISTRY = {
    "content_agent": {
        "module": "agents.content_agent",
        "function": "run_content_agent",
        "description": "Drafts engaging social media posts, announcements, and summaries.",
    },
    "scheduler_agent": {
        "module": "agents.scheduler_agent",
        "function": "run_scheduler_agent",
        "description": "Modifies the event schedule: delays events, handles cancellations, and resolves resource/room conflicts.",
    },
    "email_agent": {
        "module": "agents.email_agent",
        "function": "run_email_agent",
        "description": "Drafts highly personalised emails based on the participant schedule map.",
    },
    "budget_agent": {
        "module": "agents.budget_agent",
        "function": "run_budget_agent",
        "description": "Tracks event budget, categorises expenses, flags overruns, suggests reallocation.",
    },
    "logistics_agent": {
        "module": "agents.logistics_agent",
        "function": "run_logistics_agent",
        "description": "Tracks equipment delivery, vendor status, room readiness, and reports issues.",
    },
}
