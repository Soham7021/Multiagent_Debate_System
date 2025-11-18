def finance_agent(decision):
    return f"""
You are the Finance Agent.
Analyze the financial impact.

Decision: {decision}

Return JSON:
{{
 "recommendation": "accept",
 "reason": "text",
 "financial_score": 0
}}
"""

