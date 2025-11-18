// js/ui.js

// Emoji map for agents
const AGENT_EMOJI = {
  "Finance": "💰",
  "Technical": "🛠️",
  "Policy": "⚖️",
  "Market": "📈",
  "Critic": "🧐",
  "Pricing": "💵",
  "Strategy": "🎯"
};

export function showSelectedFiles(fileList) {
    const el = document.getElementById("selectedFiles");
    el.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "simple-list";
    for (const f of fileList) {
        const li = document.createElement("li");
        li.textContent = f.name;
        ul.appendChild(li);
    }
    el.appendChild(ul);
}

export function showUploadedFiles(names) {
    const el = document.getElementById("uploadedList");
    el.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "simple-list";
    for (const n of names) {
        const li = document.createElement("li");
        li.textContent = n;
        ul.appendChild(li);
    }
    el.appendChild(ul);
}

export function showUploadStatus(text) {
    const el = document.getElementById("uploadStatus");
    el.textContent = text;
}

// Loading spinner control
export function setLoading(on, text = "Running debate… Agents are discussing...") {
    const load = document.getElementById("loading");
    if (on) {
        load.style.display = "flex";
        const p = load.querySelector("p");
        if (p) p.textContent = text;
    } else {
        load.style.display = "none";
    }
}

// Streaming transcript: shows messages one by one with small delay
export async function showTranscriptStreaming(transcript, perMessageMs = 900) {
    const container = document.getElementById("transcript");
    container.innerHTML = "";

    for (const message of transcript) {
        appendAgentBubble(message.agent, message.text, container);
        await sleep(perMessageMs);
        // auto-scroll
        container.scrollTop = container.scrollHeight;
    }
}

// Append a single message as chat bubble
export function appendAgentBubble(agent, text, container = null) {
    if (!container) container = document.getElementById("transcript");

    const wrapper = document.createElement("div");
    wrapper.className = "message-row";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = AGENT_EMOJI[agent] || "🤖";

    const bubbleWrap = document.createElement("div");
    bubbleWrap.className = "bubble-wrap";

    const header = document.createElement("div");
    header.className = "bubble-header";
    header.innerHTML = `<strong>${agent}</strong>`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = sanitizeForHTML(text).replace(/\n/g, "<br>");

    bubbleWrap.appendChild(header);
    bubbleWrap.appendChild(bubble);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubbleWrap);

    container.appendChild(wrapper);
}

// Render a structured judge summary (clean UI)
export function renderJudgeSummary(judge) {
    const card = document.getElementById("judgeCard");
    const out = document.getElementById("judgeOutput");

    if (!judge) {
        card.classList.add("hidden");
        out.innerHTML = "";
        return;
    }

    card.classList.remove("hidden");

    // Final recommendation badge (colored)
    const rec = judge.final_recommendation || "modify";
    const recColor = rec === "accept" ? "bg-green-200 text-green-900"
                   : rec === "reject" ? "bg-red-200 text-red-900"
                   : "bg-indigo-200 text-indigo-900";

    // build agent scores HTML
    let scoresHTML = "";
    if (judge.scores) {
        for (const [agent, score] of Object.entries(judge.scores)) {
            scoresHTML += `<div class="agent-score"><div>${agent}</div><div class="font-semibold">${score}</div></div>`;
        }
    }

    out.innerHTML = `
      <div class="mb-3">
        <div class="text-sm font-medium">Final Recommendation</div>
        <div class="mt-2 inline-block px-3 py-1 rounded ${recColor} font-semibold">${rec}</div>
      </div>

      <div class="mt-3">
        <h4 class="font-semibold">Reason</h4>
        <p class="text-sm text-gray-200 mt-1">${escapeHtml(judge.reason || "No reason provided.")}</p>
      </div>

      <div class="mt-4">
        <h4 class="font-semibold">Summary of Arguments</h4>
        <p class="text-sm text-gray-200 mt-1">${escapeHtml(judge.summary_of_arguments || "")}</p>
      </div>

    `;
}

// keep showJudgeOutput name for imports
export function showJudgeOutput(judgeObj) {
    renderJudgeSummary(judgeObj);
}

// utilities
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeForHTML(s) {
    if (!s) return "";
    return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
}

// For small strings we also show but safe-escaped
function escapeHtml(s) {
    return sanitizeForHTML(String(s)).replace(/\n/g, "<br>");
}
