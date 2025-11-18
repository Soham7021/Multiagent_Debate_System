import sqlite3
import json
import os

# Ensure DB file exists in backend folder
DB_PATH = os.path.join(os.path.dirname(__file__), "decisions.db")

# Create a connection (thread-safe disabled because FastAPI async is fine)
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cursor = conn.cursor()

# Create table if not exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()

def save_decision(text: str, result: dict):
    """
    Save a decision and its result into SQLite database.
    """
    cursor.execute(
        "INSERT INTO decisions (text, result) VALUES (?, ?)",
        (text, json.dumps(result))
    )
    conn.commit()
