from typing import Any, Dict, List

from langchain_openai import ChatOpenAI


def _personalize_template(base: str, participant: Dict[str, Any]) -> str:
    name = participant.get("name", "there")
    team = participant.get("team_name", "your team")
    college = participant.get("college", "your college")

    personalized = base
    replacements = {
        "[NAME]": name,
        "{name}": name,
        "[TEAM]": team,
        "{team}": team,
        "[COLLEGE]": college,
        "{college}": college,
    }
    for placeholder, value in replacements.items():
        personalized = personalized.replace(placeholder, value)
    return personalized


def run_email_agent(participants_data: Dict[str, Any], email_template: str) -> Dict[str, Any]:
    """
    Improve a base email template per segment and personalize per participant.
    """
    try:
        llm = ChatOpenAI(model="gpt-4o")

        system_prompt = (
            "You are an expert email copywriter for tech events.\n"
            "Write warm, engaging, personalized emails.\n"
            "Match the tone to the recipient type:\n"
            "- participants get excited/motivational tone,\n"
            "- mentors get respectful/professional tone,\n"
            "- judges get formal/prestigious tone."
        )

        segments = participants_data.get("segments", {}) or {}

        improved_templates: Dict[str, str] = {}

        for segment in segments.keys():
            user_prompt = (
                f"Improve this email template for {segment} recipients at a hackathon:\n"
                f"Base template: {email_template}\n\n"
                f"Make it specific to {segment}s. Keep it under 200 words.\n"
                "Return ONLY the improved email body, no subject line."
            )

            combined_prompt = f"{system_prompt}\n\nUser request:\n{user_prompt}"

            try:
                response = llm.invoke(combined_prompt)
                body_text = getattr(response, "content", "") or ""
                if isinstance(body_text, list):
                    body_text = " ".join(str(chunk) for chunk in body_text)
                improved_templates[segment] = str(body_text).strip()
            except Exception as segment_error:
                # Fall back to the original template if this segment call fails
                improved_templates[segment] = email_template
                print(f"run_email_agent: error improving template for segment '{segment}': {segment_error}")

        all_participants: List[Dict[str, Any]] = participants_data.get("all_participants", []) or []

        all_emails: List[Dict[str, Any]] = []
        segment_breakdown: Dict[str, int] = {
            "participant": 0,
            "mentor": 0,
            "judge": 0,
        }

        for p in all_participants:
            segment = (p.get("role") or "participant").lower()
            base_segment_template = improved_templates.get(segment, email_template)
            personalized_body = _personalize_template(base_segment_template, p)

            email_entry = {
                "name": p.get("name", "N/A"),
                "email": p.get("email", "N/A"),
                "segment": segment,
                "personalized_body": personalized_body,
            }
            all_emails.append(email_entry)

            if segment in segment_breakdown:
                segment_breakdown[segment] += 1
            else:
                segment_breakdown[segment] = segment_breakdown.get(segment, 0) + 1

            print(f"MOCK: Sending email to {email_entry['email']}")

        preview_emails = all_emails[:5]

        return {
            "status": "success",
            "total_processed": len(all_emails),
            "segment_breakdown": segment_breakdown,
            "preview_emails": preview_emails,
            "all_emails": all_emails,
            "mock_mode": True,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

