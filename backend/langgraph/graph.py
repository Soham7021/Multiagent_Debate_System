from .debate_turns import run_turn_debate

async def run_debate(decision: str):
    """
    Wrapper used by main.py to run the debate engine.
    Modify max_rounds or start_agent here.
    """
    return await run_turn_debate(
        decision=decision,
        max_rounds=7,
        start_agent="Finance"
    )
