## Event Logistics Swarm

Multi-agent FastAPI + React dashboard for orchestrating event logistics: content generation, email prep, schedule conflict resolution, and participant Q&A.

### Tech Stack

- **Backend**: FastAPI, LangGraph, LangChain, OpenAI GPT (`gpt-4o`)
- **Frontend**: React, Vite, Tailwind CSS
- **Agents**: Content, Email, Scheduler, Swarm Orchestrator, Participant Q&A

### Setup Instructions

1. **Clone the repository**
   - `git clone https://github.com/your-org/event-swarm.git`
   - `cd event-swarm`

2. **Backend setup (Python)**
   - Create and activate a virtual environment (example):
     - `python -m venv .venv`
     - On Windows: `.\.venv\Scripts\activate`
   - Install dependencies:
     - `pip install -r requirements.txt` (or your existing dependency file)
   - Create a `.env` file in `backend/` with your OpenAI API key and any other secrets, for example:
     - `OPENAI_API_KEY=your_api_key_here`
   - Run the FastAPI server from the `backend/` directory:
     - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

3. **Frontend setup (React)**
   - From the `frontend/` directory:
     - Install dependencies: `npm install`
     - Start the dev server: `npm run dev`
   - Make sure the frontend is configured to talk to the FastAPI backend at `http://localhost:8000`.

### Running a Demo

1. **Sample data**
   - Participants CSV: `backend/sample_data/sample_participants.csv`
   - Schedule JSON: `backend/sample_data/sample_schedule.json`

2. **Recommended demo flow**
   - Start with the **Scheduler Agent** tab:
     - Paste the contents of `sample_schedule.json` and run the scheduler to show conflict detection and resolution.
   - Move to the **Content Agent** tab:
     - Use an event name like "Neurathon 26" and a short brief to generate social content for the event.
   - Use the **Email Agent** tab:
     - Point the backend at `sample_participants.csv` (or load it via your existing CSV flow) and generate personalized emails.
   - Run the **Swarm** tab:
     - Provide event details, CSV path, and events JSON to show the orchestrated multi-agent workflow and activity timeline.
   - Finish with the **Q&A Bot** tab:
     - Ask participant-style questions about "Neurathon 26" to showcase the grounded Q&A experience.

### Screenshot

![Dashboard Screenshot](screenshot.png)

