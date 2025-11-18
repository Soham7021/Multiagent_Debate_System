def policy_agent(decision: str):
    return f"""
You are the Policy Agent.
Analyze legal, ethical, and compliance risks.

Decision: {decision}

Return JSON ONLY:
{{
 "recommendation": "accept | modify | reject",
 "reason": "short reasoning",
 "policy_score": 0
}}
"""
