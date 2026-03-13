from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from agents.content_agent import run_content_agent

from agents.qa_agent import run_qa_agent
from agents.scheduler_agent import run_scheduler_agent
from orchestrator import swarm_app
from state import SwarmState


class ContentRequest(BaseModel):
    event_name: str
    raw_text: str
    target_audience: str


class ScheduleRequest(BaseModel):
    events: List[dict]


class SwarmRequest(BaseModel):
    event_name: str
    raw_text: str
    target_audience: str
    csv_path: str
    email_template: str
    events: List[dict]


class QARequest(BaseModel):
    question: str
    event_name: str
    schedule: List[dict]
    generated_posts: Dict[str, Any]


app = FastAPI(title="Event Logistics Swarm API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "Backend is running!"}


@app.post("/api/content")
async def content_endpoint(payload: ContentRequest):
    try:
        result = run_content_agent(
            event_name=payload.event_name,
            raw_text=payload.raw_text,
            target_audience=payload.target_audience,
        )
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/api/email")
async def email_endpoint(
    file: UploadFile = File(...),
    template: str = Form(...),
):
    file_path: Optional[Path] = None
    try:
        file_path = UPLOAD_DIR / file.filename
        contents = await file.read()
        file_path.write_bytes(contents)

        from agents.email_agent import run
        
        result = run(csv_path=str(file_path), email_template=template)
        return result
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if file_path and file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass


@app.post("/api/schedule")
async def schedule_endpoint(payload: ScheduleRequest):
    try:
        result = run_scheduler_agent(payload.events)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


class ScheduleParseRequest(BaseModel):
    natural_text: str


class ScheduleDelayRequest(BaseModel):
    delayed_event_id: str
    delayed_event_name: str
    delay_minutes: int
    all_events: List[dict]


@app.post("/api/schedule/parse")
async def schedule_parse_endpoint(payload: ScheduleParseRequest):
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import json
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatOpenAI(model="gpt-4o", temperature=0)
        messages = [
            SystemMessage(content="Parse the event schedule from natural language into a JSON array. Each event must have: id (E001, E002...), name, speaker (empty string if none), start_time (HH:MM 24hr), end_time (HH:MM 24hr), room. Return ONLY the raw JSON array, no markdown, no explanation."),
            HumanMessage(content=payload.natural_text)
        ]
        response = llm.invoke(messages)
        text = response.content.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed_events = json.loads(text.strip())

        # Room conflict detection: same room AND time overlap
        room_conflicts = []
        for i, e1 in enumerate(parsed_events):
            for j, e2 in enumerate(parsed_events):
                if j <= i:
                    continue
                if e1.get("room", "").strip().lower() != e2.get("room", "").strip().lower():
                    continue
                # Parse times
                try:
                    s1h, s1m = map(int, e1["start_time"].split(":"))
                    e1h, e1m = map(int, e1["end_time"].split(":"))
                    s2h, s2m = map(int, e2["start_time"].split(":"))
                    e2h, e2m = map(int, e2["end_time"].split(":"))
                    start1 = s1h * 60 + s1m
                    end1 = e1h * 60 + e1m
                    start2 = s2h * 60 + s2m
                    end2 = e2h * 60 + e2m
                    if start1 < end2 and start2 < end1:
                        overlap_start = max(start1, start2)
                        overlap_end = min(end1, end2)
                        time_overlap = f"{overlap_start // 60:02d}:{overlap_start % 60:02d} – {overlap_end // 60:02d}:{overlap_end % 60:02d}"
                        room_conflicts.append({
                            "event1_name": e1["name"],
                            "event2_name": e2["name"],
                            "room": e1["room"],
                            "time_overlap": time_overlap
                        })
                except Exception:
                    pass

        return {
            "events": parsed_events,
            "room_conflicts": room_conflicts,
            "has_room_conflicts": len(room_conflicts) > 0
        }
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/schedule/delay")
async def schedule_delay_endpoint(payload: ScheduleDelayRequest):
    try:
        from dotenv import load_dotenv
        load_dotenv()
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        all_events = payload.all_events
        delayed_id = payload.delayed_event_id
        delay_mins = payload.delay_minutes

        delayed_event = next((e for e in all_events if e.get("id") == delayed_id), None)
        if not delayed_event:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=400, content={"error": "Event not found"})

        # Compute new end time
        try:
            eh, em = map(int, delayed_event["end_time"].split(":"))
            orig_end_mins = eh * 60 + em
            new_end_mins = orig_end_mins + delay_mins
            new_end_time = f"{new_end_mins // 60:02d}:{new_end_mins % 60:02d}"
        except Exception:
            new_end_time = delayed_event["end_time"]
            orig_end_mins = 0

        # Find affected events
        affected_events = []
        delayed_speaker = delayed_event.get("speaker", "").strip()
        delayed_room = delayed_event.get("room", "").strip()

        for ev in all_events:
            if ev.get("id") == delayed_id:
                continue
            try:
                sh, sm = map(int, ev["start_time"].split(":"))
                ev_start = sh * 60 + sm
            except Exception:
                continue

            reason = None
            if ev.get("room", "").strip().lower() == delayed_room.lower():
                if orig_end_mins <= ev_start < new_end_mins:
                    reason = "room"
            if not reason and delayed_speaker and ev.get("speaker", "").strip().lower() == delayed_speaker.lower():
                if orig_end_mins <= ev_start < new_end_mins:
                    reason = "speaker"
            if reason:
                affected_events.append({
                    "id": ev.get("id"),
                    "name": ev.get("name"),
                    "start_time": ev.get("start_time"),
                    "room": ev.get("room"),
                    "reason": reason
                })

        # GPT-4o impact summary
        llm = ChatOpenAI(model="gpt-4o", temperature=0.4)
        user_prompt = f"Event: {payload.delayed_event_name} ran {delay_mins} minutes over. Affected sessions: {affected_events}. Full schedule: {all_events}"
        messages = [
            SystemMessage(content="You are an event operations assistant. An event has run over time. Based on the delay and affected sessions, write a concise impact summary and suggest specific time adjustments. Be practical, max 4 sentences."),
            HumanMessage(content=user_prompt)
        ]
        gpt_response = llm.invoke(messages)
        suggestion = gpt_response.content.strip()

        affected_names = [a["name"] for a in affected_events]
        notification_message = (
            f"⚠️ Schedule Update: {payload.delayed_event_name} ran {delay_mins} mins late. "
            + (f"Affected: {', '.join(affected_names)}. " if affected_names else "No downstream sessions affected. ")
            + suggestion
        )

        return {
            "delayed_event": payload.delayed_event_name,
            "delay_minutes": delay_mins,
            "new_end_time": new_end_time,
            "affected_events": affected_events,
            "suggestion": suggestion,
            "notification_message": notification_message
        }
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/swarm/run")
async def swarm_run_endpoint(payload: SwarmRequest):
    try:
        initial_state: SwarmState = {
            "event_name": payload.event_name,
            "raw_text": payload.raw_text,
            "target_audience": payload.target_audience,
            "csv_path": payload.csv_path,
            "email_template": payload.email_template,
            "events": payload.events,
            "generated_posts": {},
            "schedule": [],
            "email_results": {},
            "conflicts_found": False,
            "changes": [],
            "last_agent": "",
            "messages": [],
            "activity_log": [],
        }

        result: Dict[str, Any] = swarm_app.invoke(initial_state)

        return {
            "activity_log": result.get("activity_log", []),
            "generated_posts": result.get("generated_posts", {}),
            "schedule": result.get("schedule", []),
            "email_results": result.get("email_results", {}),
            "conflicts_found": result.get("conflicts_found", False),
            "changes": result.get("changes", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/qa")
async def qa_endpoint(payload: QARequest):
    try:
        context: Dict[str, Any] = {
            "event_name": payload.event_name,
            "schedule": payload.schedule,
            "generated_posts": payload.generated_posts,
        }
        result = run_qa_agent(payload.question, context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class EmailSendRequest(BaseModel):
    preview: List[dict]

@app.post("/api/email/send")
async def email_send_endpoint(payload: EmailSendRequest):
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        gmail_user = os.getenv("GMAIL_USER")
        gmail_password = os.getenv("GMAIL_APP_PASSWORD")

        if not gmail_user or not gmail_password:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=500, content={"error": "Gmail credentials not configured in .env"})

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(gmail_user, gmail_password)

        count = 0
        for item in payload.preview:
            msg = MIMEMultipart()
            msg["From"] = gmail_user
            msg["To"] = item["email"]
            msg["Subject"] = item["subject"]
            msg.attach(MIMEText(item["body"], "plain"))
            
            server.sendmail(gmail_user, item["email"], msg.as_string())
            count += 1
            
        server.quit()

        return {
            "sent": count,
            "status": "dispatched",
            "message": f"Successfully sent {count} emails via Gmail"
        }
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})

from datetime import datetime

class TrackerLoadRequest(BaseModel):
    events: List[dict]

@app.post("/api/tracker/load")
async def tracker_load_endpoint(payload: TrackerLoadRequest):
    try:
        now = datetime.now()
        current_total_minutes = now.hour * 60 + now.minute

        enriched_events = []
        live_count = 0
        upcoming_count = 0
        ended_count = 0

        for ev in payload.events:
            start_str = ev.get("start", "00:00")
            end_str = ev.get("end", "00:00")
            
            try:
                sh, sm = map(int, start_str.split(":"))
                start_mins = sh * 60 + sm
            except Exception:
                start_mins = 0
                
            try:
                eh, em = map(int, end_str.split(":"))
                end_mins = eh * 60 + em
            except Exception:
                end_mins = 0

            if current_total_minutes < start_mins:
                status = "upcoming"
                upcoming_count += 1
                sec_rem = (start_mins - current_total_minutes) * 60
            elif current_total_minutes >= end_mins:
                status = "ended"
                ended_count += 1
                sec_rem = 0
            else:
                status = "live"
                live_count += 1
                sec_rem = (end_mins - current_total_minutes) * 60

            ev_copy = dict(ev)
            ev_copy["status"] = status
            ev_copy["seconds_remaining"] = sec_rem
            enriched_events.append(ev_copy)

        return {
            "events": enriched_events,
            "total": len(enriched_events),
            "live_count": live_count,
            "upcoming_count": upcoming_count,
            "ended_count": ended_count
        }
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})


class TrackerFeedbackRequest(BaseModel):
    event_id: str
    event_name: str
    ran_on_time: bool
    issues: str
    rating: int
    next_event_name: str
    delay_minutes: int

@app.post("/api/tracker/feedback")
async def tracker_feedback_endpoint(payload: TrackerFeedbackRequest):
    try:
        from dotenv import load_dotenv
        load_dotenv()

        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
        system_prompt = "You are an intelligent event operations assistant helping manage a live technical hackathon. Based on organizer feedback about a completed session, provide a brief actionable recommendation for the next session. Be specific, concise, and practical. Maximum 3 sentences."
        
        user_prompt = f"""Event completed: {payload.event_name}
Ran on time: {payload.ran_on_time}
Issues: {payload.issues if payload.issues else 'None'}
Rating: {payload.rating}/5
Delay: {payload.delay_minutes} minutes
Next event: {payload.next_event_name}
What adjustments should be made for the next event?
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = llm.invoke(messages)
        
        return {
            "event_id": payload.event_id,
            "event_name": payload.event_name,
            "suggestion": response.content,
            "status": "processed"
        }
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})
