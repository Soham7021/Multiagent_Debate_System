from .debate_turns import run_turn_debate

async def run_debate(decision: str):
    """
    Wrapper used by main.py to run the debate engine.
    We now control max_messages from here for easy tuning.
    """
    return await run_turn_debate(
        decision=decision,
        max_messages=7,   # <--- adjust debate length here
        start_agent="Finance"
    )
