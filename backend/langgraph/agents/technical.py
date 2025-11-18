def technical_agent(decision: str):
    return f"""
You are the Technical Agent.
Analyze technical feasibility, engineering effort, and risks.

Decision: {decision}

Return JSON ONLY:
{{
 "recommendation": "accept | modify | reject",
 "reason": "short reasoning",
 "tech_score": 0
}}
"""
