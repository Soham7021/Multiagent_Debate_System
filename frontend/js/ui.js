/**
 * UI helpers: render chat bubbles, avatars, autoscroll, typing effect
 */

const AGENT_META = {
  "Finance": { color: "bg-amber-600", emoji: "💰" },
  "Technical": { color: "bg-sky-600", emoji: "⚙️" },
  "Policy": { color: "bg-violet-600", emoji: "🏛️" },
  "Market": { color: "bg-emerald-600", emoji: "📈" },
  "Critic": { color: "bg-rose-600", emoji: "🔍" },
  "Pricing": { color: "bg-indigo-600", emoji: "💵" },
  "Strategy": { color: "bg-fuchsia-600", emoji: "🎯" }
};

function createAgentBlock(agent, text, compact=false) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-start space-x-3";

  const meta = AGENT_META[agent] || { color: "bg-gray-600", emoji: "🧠" };

  const avatar = document.createElement("div");
  avatar.className = `agent-avatar ${meta.color}`;
  avatar.innerText = meta.emoji;

  const content = document.createElement("div");
  content.className = "flex-1";

  const header = document.createElement("div");
  header.className = "text-sm font-semibold text-gray-800 dark:text-gray-200";
  header.innerText = agent;

  const bubble = document.createElement("div");
  bubble.className = "agent-bubble mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm";
  bubble.style.border = "1px solid rgba(0,0,0,0.04)";
  bubble.innerText = text;

  content.appendChild(header);
  content.appendChild(bubble);

  wrapper.appendChild(avatar);
  wrapper.appendChild(content);

  return wrapper;
}

export function showSelectedFiles(files) {
  const el = document.getElementById("selectedFiles");
  el.innerHTML = "<strong>Selected:</strong><br>" + Array.from(files).map(f => f.name).join("<br>");
}

export function showUploadedFiles(list) {
  const el = document.getElementById("uploadedList");
  el.innerHTML = "<strong>Uploaded:</strong><br>" + list.join("<br>");
}

export function showUploadStatus(msg) {
  const el = document.getElementById("uploadStatus");
  el.innerText = msg;
}

/** Append a single agent message to chat and auto-scroll */
export function appendAgentMessage(agent, text) {
  const chat = document.getElementById("chatWindow");
  const block = createAgentBlock(agent, text);
  chat.appendChild(block);
  chat.scrollTop = chat.scrollHeight + 1000;
}

/** Stream messages one-by-one with small delay (simulated streaming) */
export async function streamTranscript(transcript, delay = 900) {
  const chat = document.getElementById("chatWindow");
  chat.innerHTML = ""; // clear previous
  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i];
    // show typing placeholder
    const placeholder = createAgentBlock(msg.agent, "…");
    placeholder.querySelector(".agent-bubble").classList.add("opacity-60", "italic");
    chat.appendChild(placeholder);
    chat.scrollTop = chat.scrollHeight + 1000;

    // wait a bit to simulate thinking/typing
    await new Promise(r => setTimeout(r, Math.min(delay, 1200)));

    // replace placeholder text with real
    placeholder.querySelector(".agent-bubble").classList.remove("opacity-60", "italic");
    placeholder.querySelector(".agent-bubble").innerText = msg.text;

    chat.scrollTop = chat.scrollHeight + 1000;

    // small pause before next
    await new Promise(r => setTimeout(r, 200));
  }
}

/** Render judge output */
export function showJudgeOutput(judgeObj) {
  const judgeCard = document.getElementById("judgeCard");
  judgeCard.classList.remove("hidden");
  const pre = document.getElementById("judgeOutput");
  pre.textContent = JSON.stringify(judgeObj, null, 2);
}
