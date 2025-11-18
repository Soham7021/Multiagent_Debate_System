from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List
from langgraph.graph import run_debate
from database.db import save_decision
from fastapi.middleware.cors import CORSMiddleware


# Import the function that adds company docs into FAISS index
from langgraph.debate_turns import add_company_documents

app = FastAPI(
    title="AI Multi-Agent Debate Engine",
    description="Simulates turn-by-turn human-like debates between AI agents.",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all frontend origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DecisionRequest(BaseModel):
    decision: str

class DocsUploadRequest(BaseModel):
    docs: List[str]


@app.get("/")
async def root():
    return {"message": "AI Debate Engine Running (Turn-Based Mode)"}


@app.post("/simulate")
async def simulate(request: DecisionRequest):
    """
    Run a full turn-by-turn debate simulation.
    """
    if not request.decision or not request.decision.strip():
        raise HTTPException(status_code=400, detail="Decision text is required.")

    debate_result = await run_debate(request.decision)

    # Save result into SQLite
    try:
        save_decision(request.decision, debate_result)
    except Exception as e:
        # Log error in production; for now return with partial success
        return {
            "success": False,
            "message": "Debate ran but failed to save result to DB.",
            "error": str(e),
            "decision": request.decision,
            "result": debate_result
        }

    return {
        "success": True,
        "decision": request.decision,
        "result": debate_result
    }


@app.post("/company/upload-files")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload one or more text files (multipart/form-data).
    Each file's text content will be read and added to the company document store.
    Accepts plain .txt, .md, or small PDFs (PDFs must be pre-converted in MVP).
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    docs = []
    for f in files:
        # Read file bytes and decode; handle text files only in MVP
        try:
            content_bytes = await f.read()
            # Try decode as utf-8 text
            try:
                text = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                # fallback: latin-1
                text = content_bytes.decode("latin-1")

            # Basic trimming & validation
            text = text.strip()
            if text:
                docs.append(text)
        finally:
            await f.close()

    if not docs:
        raise HTTPException(status_code=400, detail="Uploaded files contained no readable text.")

    try:
        add_company_documents(docs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add file documents: {e}")

    return {"success": True, "added_files": len(docs)}


# Optional: health endpoint
@app.get("/health")
async def health():
    return {"status": "ok"}
