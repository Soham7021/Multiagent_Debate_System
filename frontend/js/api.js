// API wrapper: adjust host if needed
export const API_BASE = "http://localhost:8000";

/**
 * Upload multiple files (FormData). Field name = "files" to match FastAPI.
 * files: FileList or Array of File
 */
export async function uploadFileDocs(files) {
  try {
    const form = new FormData();
    for (let f of files) form.append("files", f);
    const res = await fetch(`${API_BASE}/company/upload-files`, {
      method: "POST",
      body: form
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("uploadFileDocs error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Start debate by sending decision text
 */
export async function startDebate(decision) {
  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("startDebate error:", err);
    return { success: false, error: err.message || String(err) };
  }
}
