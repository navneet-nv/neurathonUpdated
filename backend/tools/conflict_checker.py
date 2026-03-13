from datetime import datetime
from typing import Any, Dict, List


def _parse_time(value: str) -> datetime:
    """Parse a time or datetime string into a datetime for comparison."""
    value = value.strip()
    for fmt in ("%Y-%m-%d %H:%M", "%H:%M", "%Y-%m-%dT%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse time: {value}")


def _events_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
    s1 = _parse_time(start1)
    e1 = _parse_time(end1)
    s2 = _parse_time(start2)
    e2 = _parse_time(end2)
    return s1 < e2 and s2 < e1


def check_conflicts(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Detect room and speaker conflicts in a list of events.
    """
    conflicts: List[Dict[str, Any]] = []
    n = len(events)

    for i in range(n):
        for j in range(i + 1, n):
            e1 = events[i]
            e2 = events[j]

            try:
                if not all(
                    k in e1 and k in e2
                    for k in ("start_time", "end_time", "room", "speaker", "name")
                ):
                    continue

                if not _events_overlap(
                    str(e1["start_time"]),
                    str(e1["end_time"]),
                    str(e2["start_time"]),
                    str(e2["end_time"]),
                ):
                    continue

                # Room conflict
                if str(e1.get("room")) == str(e2.get("room")):
                    conflicts.append(
                        {
                            "type": "room",
                            "event1": e1.get("name"),
                            "event2": e2.get("name"),
                            "conflict_detail": (
                                f"Room conflict in {e1.get('room')} between "
                                f"'{e1.get('name')}' and '{e2.get('name')}' "
                                f"({e1.get('start_time')}-{e1.get('end_time')} vs "
                                f"{e2.get('start_time')}-{e2.get('end_time')})."
                            ),
                        }
                    )

                # Speaker conflict
                speaker1 = str(e1.get("speaker"))
                speaker2 = str(e2.get("speaker"))
                if speaker1 and speaker1 != "N/A" and speaker1 == speaker2:
                    conflicts.append(
                        {
                            "type": "speaker",
                            "event1": e1.get("name"),
                            "event2": e2.get("name"),
                            "conflict_detail": (
                                f"Speaker conflict for {speaker1} between "
                                f"'{e1.get('name')}' and '{e2.get('name')}' "
                                f"({e1.get('start_time')}-{e1.get('end_time')} vs "
                                f"{e2.get('start_time')}-{e2.get('end_time')})."
                            ),
                        }
                    )
            except Exception:
                # Skip malformed events but don't crash
                continue

    return conflicts

