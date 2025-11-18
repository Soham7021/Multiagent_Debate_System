// js/app.js
import { uploadFileDocs, startDebate } from "./api.js";
import {
  showSelectedFiles,
  showUploadedFiles,
  showUploadStatus,
  showTranscriptStreaming,
  showJudgeOutput,
  setLoading
} from "./ui.js";

let uploadedFilesMemory = [];

document.getElementById("uploadFilesBtn").onclick = () => {
    document.getElementById("fileInput").click();
};

document.getElementById("fileInput").onchange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    showSelectedFiles(files);
    showUploadStatus("Uploading...");
    const result = await uploadFileDocs(files);
    if (result.success) {
        uploadedFilesMemory.push(...Array.from(files).map(f => f.name));
        showUploadedFiles(uploadedFilesMemory);
        showUploadStatus(`Uploaded ${result.added_files || files.length} files.`);
    } else {
        showUploadStatus("Upload failed.");
        console.error(result.error);
    }
};

// Start debate flow
document.getElementById("startDebateBtn").onclick = async () => {
    const decision = document.getElementById("decisionInput").value.trim();
    if (!decision) return alert("Enter a decision first!");

    // clear previous transcript & judge
    document.getElementById("transcript").innerHTML = "";
    document.getElementById("judgeOutput").innerHTML = "";

    setLoading(true, "Starting debate — agents are preparing...");
    const data = await startDebate(decision);
    setLoading(false);

    if (!data.success) {
        alert("Debate failed. See console for details.");
        console.error(data.error);
        return;
    }

    const result = data.result || data;

    // show streaming transcript
    const transcript = (result.transcript || []);
    // If transcript elements are strings, convert to {agent, text} expected shape
    const normalized = transcript.map(t => {
        if (typeof t === "string") return { agent: "Agent", text: t };
        return t;
    });

    await showTranscriptStreaming(normalized, 900);

    // show structured judge summary
    const judge = result.judge || result;
    showJudgeOutput(judge);
};
