import asyncio
import random
import numpy as np
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import faiss

from .llm import ask_llm
from .json_utils import extract_json


# ============================================
# AGENT DEFINITIONS
# ============================================

AGENT_NAMES = ["Finance", "Technical", "Policy", "Market", "Critic", "Pricing", "Strategy"]

ROLE_DESCRIPTIONS = {
    "Finance": "You are the Finance Agent. Focus on revenue, cost, ROI, profit margins, CAC, LTV.",
    "Technical": "You are the Technical Agent. Focus on engineering feasibility, technical debt, dependencies, timelines.",
    "Policy": "You are the Policy Agent. Focus on compliance, regulations, ethics, and data privacy.",
    "Market": "You are the Market Agent. Focus on customer behavior, competition, demand, and segmentation.",
    "Critic": "You are the Critic Agent. Challenge assumptions and find contradictions or hidden risks.",
    "Pricing": "You are the Pricing Agent. Focus on pricing strategy, elasticity, tiering, discounts and psychological pricing.",
    "Strategy": "You are the Strategy Agent. Focus on long-term vision, positioning, and strategic risks/benefits."
}


# ============================================
# SPEAKER SELECTOR PROMPT
# ============================================

SELECTOR_PROMPT = """
You are a selector deciding which agent should speak next.
Decision: {decision}

Agents: {agents_list}

Conversation so far:
{conversation}

Rules:
- Choose exactly ONE agent name from the list.
- Choose the agent who can contribute the most useful next point.
- If the debate should stop and Judge should decide, reply exactly: Judge

Return ONLY the agent name or the word "Judge".
"""


# ============================================
# JUDGE PROMPT (human-readable JSON)
# ============================================

JUDGE_PROMPT = """
You are the Judge. Read the debate transcript and produce a clear, human-readable summary in JSON.

Decision: {decision}

Transcript:
{conversation}

Return ONLY valid JSON with these fields (use natural sentences for 'reason' and 'summary_of_arguments'):
{{
 "final_recommendation": "accept | modify | reject",
 "reason": "Explain the reasoning clearly in 2-4 sentences (human-readable).",
 "summary_of_arguments": "A short paragraph summarizing the main supporting and opposing arguments (human-readable).",
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
Please do not include extra commentary or text outside the JSON.
"""


# ============================================
# UTILITIES
# ============================================

def format_conversation(messages: List[Dict[str, str]]) -> str:
    if not messages:
        return "(no messages yet)"
    return "\n\n".join([f"{m['agent']}: {m['text']}" for m in messages])

def recent_conversation(messages: List[Dict[str, str]], n: int = 4) -> List[Dict[str, str]]:
    """Return the last n messages to keep prompts small."""
    if not messages:
        return []
    return messages[-n:]


# ============================================
# EMBEDDINGS + FAISS (RAG)
# ============================================

EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
EMBED_DIM = 384  # MiniLM-L6-v2 dimensionality

faiss_index = faiss.IndexFlatL2(EMBED_DIM)
DOCUMENT_STORE: List[str] = []  # in-memory store of raw document chunks


def embed(text: str):
    vec = EMBED_MODEL.encode([text])[0]
    return np.array(vec, dtype=np.float32)


def add_company_documents(docs: List[str]):
    """Add company docs into the in-memory FAISS index and document store."""
    global DOCUMENT_STORE, faiss_index
    for d in docs:
        DOCUMENT_STORE.append(d)
        vec = embed(d)
        faiss_index.add(np.array([vec]))
    print(f"[RAG] Added {len(docs)} documents. DOCUMENT_STORE size: {len(DOCUMENT_STORE)}")


def retrieve_docs(query: str, k=3):
    """Return top-k documents for a query using FAISS. If store empty return []."""
    if len(DOCUMENT_STORE) == 0:
        return []

    q = embed(query)
    q = np.expand_dims(q, axis=0)
    distances, indices = faiss_index.search(q, k)

    docs = []
    for idx in indices[0]:
        if idx < len(DOCUMENT_STORE):
            docs.append(DOCUMENT_STORE[idx])
    return docs


def summarize_docs(docs: List[str]) -> str:
    if not docs:
        return "No relevant company documents found."
    bullets = "\n".join([f"- {d[:200]}..." for d in docs[:3]])
    return bullets


# ============================================
# HYDE (generate hypothetical doc)
# ============================================

async def generate_hyde(decision: str, conversation: List[Dict[str, str]]):
    recent = conversation[-1]["text"] if conversation else ""
    prompt = f"""
Generate a short hypothetical internal note (3–4 sentences) that might exist in the company's docs
and is relevant to this decision. Be factual and concise.

Decision: {decision}
Recent conversation excerpt: {recent}
"""
    text = await ask_llm(prompt)
    return text.strip()


async def get_evidence(decision: str, conversation: List[Dict[str, str]]):
    """Main HyDE + RAG pipeline; returns hyde text, retrieved docs, and their summary.
       Also prints debug info to stdout so you can inspect behavior in the backend logs."""
    # 1. HyDE generation
    hyde_text = await generate_hyde(decision, conversation)

    # 2. Retrieve documents with HyDE query
    docs = retrieve_docs(hyde_text, k=3)

    # 3. Bullet summary
    summary = summarize_docs(docs)

    # Debug logging so you can see what's happening in backend logs
    try:
        print("=== HyDE GENERATED ===")
        print(hyde_text)
        print("=== RAG RETRIEVED DOCS ===")
        if docs:
            for i, d in enumerate(docs):
                print(f"[doc {i}] {d[:300]}...")
        else:
            print("[no docs retrieved]")
    except Exception:
        # avoid crashing on logging issues
        pass

    return {"hyde": hyde_text, "docs": docs, "summary": summary}


# ============================================
# AGENT TURN (short conversational outputs)
# ============================================

async def agent_speak(agent_name: str, decision: str, conversation: List[Dict[str, str]]):
    role = ROLE_DESCRIPTIONS.get(agent_name, f"You are the {agent_name} agent.")
    recent_msgs = recent_conversation(conversation, n=4)
    evidence = await get_evidence(decision, recent_msgs)

    # Short, conversational agent prompt (3-4 short sentences)
    prompt = f"""
{role}

You participate in a concise, fast-paced debate.

Decision: {decision}

Recent conversation excerpt:
{format_conversation(recent_msgs)}

Evidence (brief):
- HyDE: {evidence['hyde']}
- Company summary: {evidence['summary']}

RULES:
- Reply with 3–4 short sentences only (like speaking in a meeting).
- Be conversational and reference previous messages briefly.
- Make one clear claim and a short supporting fact/example.
- End your reply with a single line: Score: X/10

Now respond.
"""
    reply = await ask_llm(prompt)
    return reply.strip()


# ============================================
# SELECT NEXT AGENT
# ============================================

async def select_next_agent(decision: str, conversation: List[Dict[str, str]]) -> str:
    conv_text = format_conversation(conversation)
    prompt = SELECTOR_PROMPT.format(
        decision=decision,
        agents_list=", ".join(AGENT_NAMES),
        conversation=conv_text
    )

    resp = await ask_llm(prompt)
    text = resp.strip()

    if "judge" in text.lower():
        return "Judge"

    for agent in AGENT_NAMES:
        if agent.lower() in text.lower():
            return agent

    # fallback: pick an agent not speaking in last turn if possible
    last_agent = conversation[-1]["agent"] if conversation else None
    candidates = [a for a in AGENT_NAMES if a != last_agent]
    if candidates:
        return random.choice(candidates)
    return random.choice(AGENT_NAMES)


# ============================================
# DEBATE LOOP (3 rounds, up to turns_per_round turns each)
# ============================================

async def run_turn_debate(decision: str, max_rounds: int = 3, turns_per_round: int = 3, start_agent: str = "Finance"):
    """
    Debate structure:
      - Up to `max_rounds` rounds to limit tokens (defaults to 3).
      - In each round, up to `turns_per_round` agent turns (defaults to 3).
      - Selector decides who speaks next; if it returns "Judge", judge will be invoked early.
      - Agents produce short conversational replies.
    """
    conversation: List[Dict[str, str]] = []

    # Opening statement: start_agent or first in list
    first_agent = start_agent if start_agent in AGENT_NAMES else AGENT_NAMES[0]
    opening_text = await agent_speak(first_agent, decision, conversation)
    conversation.append({"agent": first_agent, "text": opening_text})

    for round_idx in range(1, max_rounds + 1):
        # for each round, allow a few turns
        for t in range(turns_per_round):
            next_agent = await select_next_agent(decision, conversation)

            if next_agent == "Judge":
                # break out to judge early
                round_idx = max_rounds + 1
                break

            # Avoid same agent speaking twice in a row most of the time
            if len(conversation) > 0 and conversation[-1]["agent"] == next_agent:
                if random.random() < 0.6:
                    others = [a for a in AGENT_NAMES if a != next_agent]
                    if others:
                        next_agent = random.choice(others)

            reply = await agent_speak(next_agent, decision, conversation)
            conversation.append({"agent": next_agent, "text": reply})

        # if selector asked Judge earlier, break outer loop
        if next_agent == "Judge":
            break

    # JUDGE: summarize and produce final recommendation
    judge_prompt = JUDGE_PROMPT.format(
        decision=decision,
        conversation=format_conversation(conversation)
    )

    judge_raw = await ask_llm(judge_prompt)

    try:
        judge_json = extract_json(judge_raw)
    except Exception:
        # Groom a simple fallback human-readable judge output
        judge_json = {
            "final_recommendation": "modify",
            "reason": "Judge failed to return valid JSON; see raw output.",
            "summary_of_arguments": "",
            "scores": {a: 5 for a in AGENT_NAMES},
            "final_score": 5,
            "raw": judge_raw
        }

    return {"decision": decision, "transcript": conversation, "judge": judge_json}
