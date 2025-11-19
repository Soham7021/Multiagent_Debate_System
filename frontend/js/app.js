// js/app.js - Enhanced Application Logic
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

// File Upload Handler
document.getElementById("uploadFilesBtn").onclick = () => {
    document.getElementById("fileInput").click();
};

document.getElementById("fileInput").onchange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    showSelectedFiles(files);
    showUploadStatus("Uploading files...");
    
    const result = await uploadFileDocs(files);
    
    if (result.success) {
        uploadedFilesMemory.push(...Array.from(files).map(f => f.name));
        showUploadedFiles(uploadedFilesMemory);
        showUploadStatus(`Successfully uploaded ${result.added_files || files.length} file(s)`);
    } else {
        showUploadStatus("Upload failed. Please try again.");
        console.error("Upload error:", result.error);
        showNotification("Upload Failed", result.error, "error");
    }
    
    // Clear input for re-upload
    e.target.value = '';
};

// Start Debate Handler
document.getElementById("startDebateBtn").onclick = async () => {
    const decision = document.getElementById("decisionInput").value.trim();
    
    if (!decision) {
        showNotification("Input Required", "Please enter a decision to debate!", "warning");
        document.getElementById("decisionInput").focus();
        return;
    }

    // Clear previous results
    const transcriptEl = document.getElementById("transcript");
    transcriptEl.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <div class="spinner-modern mx-auto mb-4"></div>
                <p class="text-purple-300 text-sm font-medium">Initializing debate...</p>
            </div>
        </div>
    `;
    
    document.getElementById("judgeOutput").innerHTML = `
        <div class="text-center py-8">
            <p class="text-sm font-medium opacity-60">Awaiting debate conclusion...</p>
        </div>
    `;

    // Disable button during debate
    const startBtn = document.getElementById("startDebateBtn");
    startBtn.disabled = true;
    startBtn.textContent = "Debate in Progress...";

    setLoading(true, "Agents are analyzing and debating...");
    
    const data = await startDebate(decision);
    
    setLoading(false);
    startBtn.disabled = false;
    startBtn.innerHTML = `
        <svg class="w-5 h-5 inline-block mr-2 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Launch Debate
    `;

    if (!data.success) {
        transcriptEl.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-red-300 font-medium mb-2">Debate Failed</p>
                    <p class="text-sm text-purple-300">Please check the console for details</p>
                </div>
            </div>
        `;
        console.error("Debate error:", data.error);
        showNotification("Debate Failed", "An error occurred. Check console for details.", "error");
        return;
    }

    const result = data.result || data;

    // Process and show streaming transcript
    const transcript = result.transcript || [];
    
    // Normalize transcript format
    const normalized = transcript.map(t => {
        if (typeof t === "string") {
            return { agent: "Agent", text: t };
        }
        return t;
    });

    if (normalized.length === 0) {
        transcriptEl.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-yellow-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <p class="text-yellow-300 font-medium">No transcript available</p>
                </div>
            </div>
        `;
    } else {
        await showTranscriptStreaming(normalized, 900);
    }

    // Show judge summary with animation
    const judge = result.judge || result;
    showJudgeOutput(judge);
    
    // Success notification
    showNotification("Debate Complete", "The agents have reached a conclusion!", "success");
    
    // Scroll to conclusion
    setTimeout(() => {
        document.getElementById("conclusionSection").scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }, 500);
};

// Enhanced notification system
function showNotification(title, message, type = "info") {
    const colors = {
        success: "from-green-500 to-emerald-600",
        error: "from-red-500 to-rose-600",
        warning: "from-yellow-500 to-orange-600",
        info: "from-blue-500 to-cyan-600"
    };
    
    const icons = {
        success: "✓",
        error: "✗",
        warning: "⚠",
        info: "ℹ"
    };
    
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 max-w-md`;
    notification.innerHTML = `
        <div class="glass-card backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl p-4 animate-slideIn">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br ${colors[type]} flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span class="text-white text-xl font-bold">${icons[type]}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-white mb-1">${escapeHtml(title)}</h4>
                    <p class="text-sm text-purple-200">${escapeHtml(message)}</p>
                </div>
                <button class="text-white hover:text-purple-300 transition-colors" onclick="this.closest('.fixed').remove()">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.transition = "opacity 0.3s ease";
        notification.style.opacity = "0";
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enter key support for input
document.getElementById("decisionInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        document.getElementById("startDebateBtn").click();
    }
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    .animate-slideIn {
        animation: slideIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);