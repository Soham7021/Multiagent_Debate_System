def judge_agent(finance, technical, policy, critic):
    return f"""
You are the Judge Agent.
Aggregate all agent responses and produce a final decision.

Finance: {finance}
Technical: {technical}
Policy: {policy}
Critic: {critic}

Return JSON ONLY:
{{
 "final_recommendation": "accept | modify | reject",
 "reason": "short reasoning",
 "scores": {{
    "finance": 0,
    "technical": 0,
    "policy": 0
 }},
 "critic_summary": "short summary",
 "final_score": 0
}}
"""
