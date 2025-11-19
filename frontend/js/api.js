// js/api.js
// Dynamic backend host so you can use localhost or 127.0.0.1
const BACKEND = `http://${location.hostname}:8000`;

export async function uploadFileDocs(files) {
    try {
        const fd = new FormData();
        for (const f of files) {
            fd.append("files", f);
        }

        const res = await fetch(`${BACKEND}/company/upload-files`, {
            method: "POST",
            body: fd
        });

        if (!res.ok) {
            const txt = await res.text();
            return { success: false, error: txt };
        }

        const data = await res.json();
        return { success: true, ...data };
    } catch (e) {
        console.error("uploadFileDocs error", e);
        return { success: false, error: String(e) };
    }
}

export async function startDebate(decision) {
    try {
        const res = await fetch(`${BACKEND}/simulate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision })
        });

        // Backend returns JSON even on non-200; guard res.ok
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return { success: false, error: data || `HTTP ${res.status}` };
        }
        
        // Expected shape { decision, result }
        return { 
            success: true, 
            result: data.result || data, 
            decision: data.decision || decision 
        };
    } catch (e) {
        console.error("startDebate error", e);
        return { success: false, error: String(e) };
    }
}