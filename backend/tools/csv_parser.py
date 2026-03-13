import re
from pathlib import Path
from typing import Dict, List, Any

import pandas as pd


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _is_valid_email(email: str) -> bool:
    if not isinstance(email, str):
        return False
    email = email.strip()
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email))


def parse_participants(file_path: str) -> Dict[str, Any]:
    """
    Parse participants from a CSV or Excel file.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)

    # Normalize columns to lower-case for lookup
    lower_cols = {c.lower(): c for c in df.columns}

    def get_col(name: str) -> List[Any]:
        col_key = lower_cols.get(name)
        if col_key is None:
            return ["N/A"] * len(df)
        series = df[col_key].fillna("N/A")
        return series.astype(str).tolist()

    names = get_col("name")
    emails = get_col("email")
    team_names = get_col("team_name")
    roles = get_col("role")
    colleges = get_col("college")

    participants: List[Dict[str, Any]] = []
    filtered_invalid = 0

    for name, email, team, role, college in zip(
        names, emails, team_names, roles, colleges
    ):
        if not _is_valid_email(email):
            filtered_invalid += 1
            continue

        participants.append(
            {
                "name": name or "N/A",
                "email": email,
                "team_name": team or "N/A",
                "role": (role or "participant").lower()
                if role and isinstance(role, str)
                else "participant",
                "college": college or "N/A",
            }
        )

    print(f"parse_participants: filtered {filtered_invalid} rows with invalid emails")

    segments: Dict[str, List[Dict[str, Any]]] = {
        "participant": [],
        "mentor": [],
        "judge": [],
    }

    for p in participants:
        role = p.get("role", "participant")
        if role not in segments:
            segments[role] = []
        segments[role].append(p)

    total = int(len(names))
    valid = int(len(participants))
    filtered = int(filtered_invalid)

    return {
        "total": total,
        "valid": valid,
        "filtered": filtered,
        "segments": segments,
        "all_participants": participants,
    }

