import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()  # loads OPENAI_API_KEY from .env

# Create the model client (simple & async-ready)
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2
)

async def ask_llm(prompt: str):
    """
    Sends a prompt to the model and returns plain text output.
    """
    response = await llm.ainvoke(prompt)
    return response.content
