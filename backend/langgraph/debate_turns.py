import asyncio
import random
import numpy as np
from typing import List, Dict
from sentence_transformers import SentenceTransformer
import faiss
from .llm import ask_llm
from .json_utils import extract_json


# =====================================================
# DEBUG TRACING (OPTIONAL)
# =====================================================

DEBUG_TRACE = {
    "hyde": [],
    "retrievals": [],
    "agent_evidence": []
}

def reset_trace():
    for k in DEBUG_TRACE:
        DEBUG_TRACE[k] = []

def get_trace():
    return DEBUG_TRACE


# =====================================================
# AGENT DEFINITIONS
# =====================================================

AGENT_NAMES = [
    "Finance", "Technical", "Policy",
    "Market", "Critic", "Pricing", "Strategy"
]

ROLE_DESCRIPTIONS = {
    "Finance": "You are the Finance Agent. Focus on revenue, cost, ROI, CAC, LTV, and financial risks.",
    "Technical": "You are the Technical Agent. Focus on feasibility, engineering complexity, timelines, risk.",
    "Policy": "You are the Policy Agent. Focus on compliance, legal, ethics, and regulatory constraints.",
    "Market": "You are the Market Agent. Focus on customer behavior, growth, churn, segmentation, and competition.",
    "Critic": "You are the Critic Agent. Challenge assumptions, expose flaws, push for clarity.",
    "Pricing": "You are the Pricing Agent. Focus on price elasticity, margin impact, and tiering.",
    "Strategy": "You are the Strategy Agent. Focus on long-term vision, competitive position, and strategic risks."
}


# =====================================================
# SELECTOR PROMPT
# =====================================================

SELECTOR_PROMPT = """
You are the moderator selecting the next agent to speak.

Decision: {decision}

Conversation so far:
{conversation}

Agents:
{agents_list}

Rules:
- Choose EXACTLY one agent who will contribute best to the next step.
- If discussion has enough arguments for a decision, return ONLY the word: Judge
- Otherwise return ONLY the name of the agent.

Output must be ONLY the agent name OR the word Judge.
"""


# =====================================================
# JUDGE PROMPT — CLEAN JSON
# =====================================================

JUDGE_PROMPT = """
You are the Judge. Produce a concise final evaluation.
You are the Judge. Return ONLY VALID JSON. 
No explanations. No emojis. No text outside JSON.

Decision: {decision}

Transcript:
{conversation}

Return EXACT JSON with:
{{
  "final_recommendation": "accept | modify | reject",
  "reason": "10-12 sentences, concise and clear",
  "summary_of_arguments": "summary of key supporting and opposing points",
  "scores": {{
    "Finance": 0,
    "Technical": 0,
    "Policy": 0,
    "Market": 0,
    "Critic": 0,
    "Pricing": 0,
    "Strategy": 0
  }},
  "final_score": 0
}}
"""


# =====================================================
# UTILS
# =====================================================

def format_conversation(messages: List[Dict[str, str]]):
    if not messages:
        return "(none yet)"
    return "\n\n".join(f"{m['agent']}: {m['text']}" for m in messages)


# =====================================================
# EMBEDDINGS + FAISS
# =====================================================

EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
EMBED_DIM = 384

faiss_index = faiss.IndexFlatL2(EMBED_DIM)
DOCUMENT_STORE: List[str] = []


def embed(text: str):
    v = EMBED_MODEL.encode([text])[0]
    return np.array(v, dtype=np.float32)


def add_company_documents(docs: List[str]):
    global DOCUMENT_STORE, faiss_index
    for d in docs:
        DOCUMENT_STORE.append(d)
        faiss_index.add(np.array([embed(d)]))
    print(f"[RAG] Added {len(docs)} docs. Total = {len(DOCUMENT_STORE)}")


def retrieve_docs(query: str, k=3):
    if len(DOCUMENT_STORE) == 0:
        return []
    q = embed(query).reshape(1, -1)
    _, idxs = faiss_index.search(q, k)
    return [DOCUMENT_STORE[i] for i in idxs[0] if i < len(DOCUMENT_STORE)]


def summarize_docs(docs: List[str]):
    if not docs:
        return "No relevant documents found."
    return "\n".join(f"- {d[:180]}..." for d in docs[:3])


# =====================================================
# HYDE GENERATION
# =====================================================

async def generate_hyde(decision: str, conversation):
    recent = conversation[-1]["text"] if conversation else ""

    prompt = f"""
Generate a short internal note relevant to this decision (3–4 sentences).
Keep it factual and concise.

Decision: {decision}
Recent context: {recent}
"""
    text = await ask_llm(prompt)
    return text.strip()


async def get_evidence(decision, conversation):
    hyde = await generate_hyde(decision, conversation)
    DEBUG_TRACE["hyde"].append(hyde[:250])

    docs = retrieve_docs(hyde)
    DEBUG_TRACE["retrievals"].append({
        "query": hyde[:150],
        "docs": [d[:150] for d in docs]
    })

    return {
        "hyde": hyde,
        "docs": docs,
        "summary": summarize_docs(docs)
    }


# =====================================================
# AGENT SPEAK (3–4 sentence responses)
# =====================================================

async def agent_speak(agent, decision, conversation):
    role = ROLE_DESCRIPTIONS[agent]

    evidence = await get_evidence(decision, conversation)
    DEBUG_TRACE["agent_evidence"].append({
        "agent": agent,
        "hyde": evidence["hyde"][:150],
        "docs": [d[:150] for d in evidence["docs"]]
    })

    prompt = f"""
{role}

Decision: {decision}

Conversation so far:
{format_conversation(conversation)}

Evidence (HyDE):
{evidence['hyde']}

Relevant company docs:
{evidence['summary']}

Respond in 3–4 clear sentences.
"""

    return (await ask_llm(prompt)).strip()


# =====================================================
# SELECT NEXT AGENT
# =====================================================

async def select_next_agent(decision, conversation):
    prompt = SELECTOR_PROMPT.format(
        decision=decision,
        conversation=format_conversation(conversation),
        agents_list=", ".join(AGENT_NAMES),
    )

    resp = (await ask_llm(prompt)).strip()

    if "judge" in resp.lower():
        return "Judge"

    for a in AGENT_NAMES:
        if a.lower() == resp.lower():
            return a

    # fallback: avoid repeating last agent too much
    last = conversation[-1]["agent"]
    choices = [a for a in AGENT_NAMES if a != last]
    return random.choice(choices)


# =====================================================
# MAIN DEBATE LOOP
# =====================================================

async def run_turn_debate(
    decision: str,
    max_messages: int = 15,
    start_agent: str = "Finance"
):
    reset_trace()
    conversation = []

    # Opening statement
    first = start_agent if start_agent in AGENT_NAMES else "Finance"
    opener = await agent_speak(first, decision, conversation)
    conversation.append({"agent": first, "text": opener})

    for _ in range(max_messages - 1):
        next_agent = await select_next_agent(decision, conversation)
        if next_agent == "Judge":
            break

        # avoid immediate duplicates
        if conversation[-1]["agent"] == next_agent and random.random() < 0.65:
            next_agent = random.choice([a for a in AGENT_NAMES if a != next_agent])

        msg = await agent_speak(next_agent, decision, conversation)
        conversation.append({"agent": next_agent, "text": msg})

    # Judge summary
    judge_prompt = JUDGE_PROMPT.format(
        decision=decision,
        conversation=format_conversation(conversation)
    )

    judge_raw = await ask_llm(judge_prompt)

    try:
        judge_json = extract_json(judge_raw)
    except:
        judge_json = {
            "final_recommendation": "modify",
            "reason": "Judge returned invalid JSON.",
            "summary_of_arguments": "",
            "scores": {a: 5 for a in AGENT_NAMES},
            "final_score": 5,
            "raw": judge_raw
        }

    return {
        "decision": decision,
        "transcript": conversation,
        "judge": judge_json
    }
