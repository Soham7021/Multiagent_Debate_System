def critic_agent(finance, technical, policy):
    return f"""
You are the Critic Agent.
Find logical flaws and contradictions.

Finance: {finance}
Technical: {technical}
Policy: {policy}

Return JSON ONLY:
{{
 "criticism": "short critique",
 "risk_level": 0
}}
"""
