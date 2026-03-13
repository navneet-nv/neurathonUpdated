from typing import Any, Dict, List, TypedDict


class ActivityLogEntry(TypedDict):
    agent: str
    status: str
    timestamp: str
    summary: str


class SwarmState(TypedDict):
    event_name: str
    raw_text: str
    target_audience: str
    csv_path: str
    email_template: str
    events: List[Dict[str, Any]]
    generated_posts: Dict[str, Any]
    schedule: List[Dict[str, Any]]
    email_results: Dict[str, Any]
    conflicts_found: bool
    changes: List[Dict[str, Any]]
    last_agent: str
    messages: List[Dict[str, Any]]
    activity_log: List[ActivityLogEntry]

