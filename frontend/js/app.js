import { uploadFileDocs, startDebate } from "./api.js";
import { showSelectedFiles, showUploadedFiles, showUploadStatus, streamTranscript, showJudgeOutput } from "./ui.js";

/** Theme toggle logic (dark/light) */
const themeToggle = document.getElementById("themeToggle");
const htmlEl = document.documentElement;
function applyInitialTheme() {
  const saved = localStorage.getItem("theme-mode");
  if (saved === "dark") {
    htmlEl.classList.add("dark");
    themeToggle.checked = true;
  } else if (saved === "light") {
    htmlEl.classList.remove("dark");
    themeToggle.checked = false;
  } else {
    // use prefers-color-scheme
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      htmlEl.classList.add("dark");
      themeToggle.checked = true;
    }
  }
}
applyInitialTheme();
themeToggle.addEventListener("change", () => {
  if (themeToggle.checked) {
    htmlEl.classList.add("dark");
    localStorage.setItem("theme-mode", "dark");
  } else {
    htmlEl.classList.remove("dark");
    localStorage.setItem("theme-mode", "light");
  }
});

/** Upload flow */
const uploadBtn = document.getElementById("uploadFilesBtn");
const fileInput = document.getElementById("fileInput");
let uploadedMemory = [];

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  showSelectedFiles(files);
  showUploadStatus("Uploading files...");
  const res = await uploadFileDocs(files);
  if (res && res.success) {
    const names = Array.from(files).map(f => f.name);
    uploadedMemory.push(...names);
    showUploadedFiles(uploadedMemory);
    showUploadStatus(`Uploaded ${res.added_files} files.`);
  } else {
    showUploadStatus("Upload failed: " + (res.error || "unknown"));
  }
});

/** Start debate */
const startBtn = document.getElementById("startDebateBtn");
const decisionInput = document.getElementById("decisionInput");
const loadingSmall = document.getElementById("loadingSmall");

startBtn.addEventListener("click", async () => {
  const decision = decisionInput.value.trim();
  if (!decision) return alert("Enter a decision to start the debate.");
  loadingSmall.classList.remove("hidden");
  // call backend
  const data = await startDebate(decision);
  loadingSmall.classList.add("hidden");

  if (!data || !data.success) {
    alert("Debate failed: " + (data?.error || "unknown"));
    return;
  }

  // stream transcript then show judge
  await streamTranscript(data.result.transcript, 900);
  showJudgeOutput(data.result.judge);
});
