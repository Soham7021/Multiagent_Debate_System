// js/ui.js - Enhanced UI Functions with Beautiful Rendering

// Emoji map for agents with enhanced styling
const AGENT_EMOJI = {
  "Finance": "💰",
  "Technical": "🛠️",
  "Policy": "⚖️",
  "Market": "📈",
  "Critic": "🧐",
  "Pricing": "💵",
  "Strategy": "🎯",
  "Agent": "🤖"
};

// Gradient backgrounds for different agents
const AGENT_GRADIENTS = {
  "Finance": "from-green-500 to-emerald-600",
  "Technical": "from-blue-500 to-cyan-600",
  "Policy": "from-purple-500 to-indigo-600",
  "Market": "from-pink-500 to-rose-600",
  "Critic": "from-yellow-500 to-orange-600",
  "Pricing": "from-teal-500 to-green-600",
  "Strategy": "from-red-500 to-pink-600",
  "Agent": "from-gray-500 to-slate-600"
};

export function showSelectedFiles(fileList) {
    const el = document.getElementById("selectedFiles");
    el.innerHTML = "";
    
    if (fileList.length === 0) return;
    
    const ul = document.createElement("ul");
    ul.className = "simple-list";
    
    for (const f of fileList) {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <span class="truncate text-purple-100">${escapeHtml(f.name)}</span>
                <span class="text-xs text-purple-300 ml-2">${formatFileSize(f.size)}</span>
            </div>
        `;
        li.style.animation = `slideIn 0.3s ease forwards`;
        li.style.animationDelay = `${Array.from(fileList).indexOf(f) * 0.05}s`;
        ul.appendChild(li);
    }
    el.appendChild(ul);
}

export function showUploadedFiles(names) {
    const el = document.getElementById("uploadedList");
    el.innerHTML = "";
    
    if (names.length === 0) return;
    
    const heading = document.createElement("div");
    heading.className = "text-sm font-semibold text-green-400 mb-2 flex items-center gap-2";
    heading.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        Uploaded Files
    `;
    el.appendChild(heading);
    
    const ul = document.createElement("ul");
    ul.className = "simple-list";   
    
    for (const n of names) {
        const li = document.createElement("li");
        li.textContent = n;
        li.style.background = "rgba(16, 185, 129, 0.15)";
        li.style.borderColor = "rgba(16, 185, 129, 0.4)";
        li.style.color = "#d1fae5";
        ul.appendChild(li);
    }
    el.appendChild(ul);
}

export function showUploadStatus(text) {
    const el = document.getElementById("uploadStatus");
    el.innerHTML = "";
    
    if (!text) return;
    
    const isSuccess = text.toLowerCase().includes("uploaded");
    const isError = text.toLowerCase().includes("failed");
    
    const statusDiv = document.createElement("div");
    statusDiv.className = `flex items-center justify-center gap-2 p-2 rounded-lg ${
        isSuccess ? 'bg-green-500/20 text-green-300' : 
        isError ? 'bg-red-500/20 text-red-300' : 
        'bg-purple-500/20 text-purple-300'
    }`;
    
    const icon = isSuccess ? '✓' : isError ? '✗' : '⟳';
    statusDiv.innerHTML = `<span class="font-bold">${icon}</span><span class="text-sm font-medium">${escapeHtml(text)}</span>`;
    
    el.appendChild(statusDiv);
}

// Loading spinner control with enhanced visuals
export function setLoading(on, text = "Running debate… Agents are discussing...") {
    const load = document.getElementById("loading");
    if (on) {
        load.style.display = "block";
        const p = load.querySelector("p");
        if (p) p.textContent = text;
    } else {
        load.style.display = "none";
    }
}

// Streaming transcript: shows messages one by one with staggered animation
export async function showTranscriptStreaming(transcript, perMessageMs = 900) {
    const container = document.getElementById("transcript");
    
    // Clear placeholder
    container.innerHTML = "";

    for (let i = 0; i < transcript.length; i++) {
        const message = transcript[i];
        appendAgentBubble(message.agent, message.text, container);
        await sleep(perMessageMs);
        
        // Auto-scroll smoothly
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Append a single message as beautiful chat bubble
export function appendAgentBubble(agent, text, container = null) {
    if (!container) container = document.getElementById("transcript");

    const wrapper = document.createElement("div");
    wrapper.className = "message-row";

    const gradient = AGENT_GRADIENTS[agent] || AGENT_GRADIENTS["Agent"];
    
    const avatar = document.createElement("div");
    avatar.className = `avatar bg-gradient-to-br ${gradient}`;
    avatar.textContent = AGENT_EMOJI[agent] || "🤖";

    const bubbleWrap = document.createElement("div");
    bubbleWrap.className = "bubble-wrap";

    const header = document.createElement("div");
    header.className = "bubble-header";
    header.innerHTML = `
        <strong>${escapeHtml(agent)}</strong>
        <span class="text-xs opacity-60">${getCurrentTime()}</span>
    `;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = formatMessageText(text);

    bubbleWrap.appendChild(header);
    bubbleWrap.appendChild(bubble);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubbleWrap);

    container.appendChild(wrapper);
}

// Render a structured judge summary with beautiful formatting
export function renderJudgeSummary(judge) {
    const card = document.getElementById("judgeCard");
    const out = document.getElementById("judgeOutput");

    if (!judge) {
        card.classList.add("hidden");
        out.innerHTML = `
            <div class="text-center py-8">
                <p class="text-sm font-medium opacity-60">Awaiting debate conclusion...</p>
            </div>
        `;
        return;
    }

    card.classList.remove("hidden");

    // Final recommendation with styled badge
    const rec = judge.final_recommendation || "modify";
    const recConfig = {
        accept: { color: "bg-green-200 text-green-900", icon: "✓", label: "Accept" },
        reject: { color: "bg-red-200 text-red-900", icon: "✗", label: "Reject" },
        modify: { color: "bg-indigo-200 text-indigo-900", icon: "↻", label: "Modify" }
    };
    
    const config = recConfig[rec] || recConfig.modify;

    // Build agent scores HTML with beautiful cards
    let scoresHTML = "";
    if (judge.scores && Object.keys(judge.scores).length > 0) {
        scoresHTML = `
            <div class="mt-6">
                <h4>Agent Scores</h4>
                <div class="space-y-2 mt-3">
        `;
        for (const [agent, score] of Object.entries(judge.scores)) {
            const emoji = AGENT_EMOJI[agent] || "🤖";
            scoresHTML += `
                <div class="agent-score">
                    <div class="flex items-center gap-2">
                        <span>${emoji}</span>
                        <span>${escapeHtml(agent)}</span>
                    </div>
                    <div class="font-semibold">${escapeHtml(String(score))}</div>
                </div>
            `;
        }
        scoresHTML += `</div></div>`;
    }

    out.innerHTML = `
      <div class="mb-4">
        <div class="text-sm font-medium text-yellow-400 mb-3">Final Recommendation</div>
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg ${config.color} font-bold text-lg">
            <span>${config.icon}</span>
            <span>${config.label}</span>
        </div>
      </div>

      <div class="mt-6">
        <h4>Decision Rationale</h4>
        <p class="text-sm text-gray-300 mt-2 leading-relaxed">${formatMessageText(judge.reason || "No reason provided.")}</p>
      </div>

      <div class="mt-6">
        <h4>Summary of Arguments</h4>
        <p class="text-sm text-gray-300 mt-2 leading-relaxed">${formatMessageText(judge.summary_of_arguments || "No summary available.")}</p>
      </div>

      
      
    `;
}

// Keep legacy name for compatibility
export function showJudgeOutput(judgeObj) {
    renderJudgeSummary(judgeObj);
}

// === Utility Functions ===

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageText(text) {
    if (!text) return "";
    return escapeHtml(text).replace(/\n/g, "<br>");
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}