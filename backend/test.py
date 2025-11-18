import asyncio
from langgraph.llm import ask_llm

async def main():
    print("Testing LLM...")
    response = await ask_llm("Say hello in one short sentence.")
    print("\nLLM response:")
    print(response)

if __name__ == "__main__":
    asyncio.run(main())
