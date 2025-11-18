import json
import re

def extract_json(text: str):
    """
    Extracts the first JSON object found in a text string.
    LLMs often add extra text, this fixes it.
    """
    try:
        # Regex to capture the first {...} JSON block
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found")

        json_str = match.group(0)
        return json.loads(json_str)

    except Exception as e:
        raise ValueError(f"Failed to parse LLM output as JSON.\nOutput was:\n{text}\nError: {e}")
