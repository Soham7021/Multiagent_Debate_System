import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise ValueError("Missing OPENROUTER_API_KEY in .env")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Required OpenRouter headers
BASE_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:5500",       # required
    "X-Title": "MultiAgent-Debate-Local"           # required
}

# Async httpx client
client = httpx.AsyncClient(timeout=40.0)

async def call_openrouter(system_prompt, user_prompt, max_retries=3):
    payload = {
        # "model": "meta-llama/llama-3-8b-instruct",
        "model": "google/gemma-2-9b-it",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.5,
        "max_tokens": 500
    }

    for attempt in range(max_retries):
        try:
            resp = await client.post(OPENROUTER_URL, headers=BASE_HEADERS, json=payload)

            if resp.status_code != 200:
                print("[LLM ERROR]", resp.text)
                raise Exception(resp.text)

            data = resp.json()
            return data["choices"][0]["message"]["content"]

        except Exception as e:
            print(f"[OpenRouter] Error: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1.5)
                continue
            raise e

async def ask_llm(prompt: str, system_prompt="You are a helpful assistant."):
    """Unified interface for the entire debate pipeline."""
    return await call_openrouter(system_prompt, prompt)
