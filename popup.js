const PRESET_TAGS = ["coding", "writing", "image", "research", "productivity"];
const PLATFORMS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "Grok"];

let allPrompts = [];
let filteredPrompts = [];
let currentFilters = {
  search: "",
  platform: "",
  tag: ""
};
let pendingDelete = null;
let editingId = null;
let deleteTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadPrompts();
  setupEventListeners();
  loadTheme();
  renderChipRow();
  renderPrompts();
});

async function loadPrompts() {
  const { prompts = [] } = await chrome.storage.local.get("prompts");
  allPrompts = prompts;
  applyFilters();
}

function setupEventListeners() {
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentFilters.search = e.target.value.toLowerCase();
    applyFilters();
    renderPrompts();
  });
}

/* ─── Theme ─── */
function loadTheme() {
  chrome.storage.local.get("theme", ({ theme = "light" }) => {
    document.body.setAttribute("data-theme", theme);
  });
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", next);
  chrome.storage.local.set({ theme: next });
}

/* ─── Chip Row (Platforms + Tags) ─── */
function renderChipRow() {
  const container = document.getElementById("chipRow");
  const allTags = new Set();
  allPrompts.forEach(p => p.tags?.forEach(t => allTags.add(t)));

  container.innerHTML = "";

  // "All" chip
  const allChip = document.createElement("button");
  allChip.className = "chip" + (currentFilters.platform === "" ? " active" : "");
  allChip.textContent = "All";
  allChip.addEventListener("click", () => {
    currentFilters.platform = "";
    renderChipRow();
    applyFilters();
    renderPrompts();
  });
  container.appendChild(allChip);

  // Platform chips
  PLATFORMS.forEach(p => {
    const chip = document.createElement("button");
    chip.className = "chip" + (currentFilters.platform === p ? " active" : "");
    chip.textContent = p;
    chip.addEventListener("click", () => {
      currentFilters.platform = currentFilters.platform === p ? "" : p;
      renderChipRow();
      applyFilters();
      renderPrompts();
    });
    container.appendChild(chip);
  });

  // Divider + tag chips (only if tags exist)
  if (allTags.size > 0) {
    const divider = document.createElement("div");
    divider.className = "chip-divider";
    container.appendChild(divider);

    allTags.forEach(tag => {
      const chip = document.createElement("button");
      chip.className = "chip" + (currentFilters.tag === tag ? " active" : "");
      chip.textContent = `#${tag}`;
      chip.addEventListener("click", () => {
        currentFilters.tag = currentFilters.tag === tag ? "" : tag;
        renderChipRow();
        applyFilters();
        renderPrompts();
      });
      container.appendChild(chip);
    });
  }
}

/* ─── Filtering & Sorting ─── */
function applyFilters() {
  filteredPrompts = allPrompts.filter(p => {
    const matchSearch =
      currentFilters.search === "" ||
      p.text.toLowerCase().includes(currentFilters.search) ||
      (p.title || "").toLowerCase().includes(currentFilters.search);

    const matchPlatform =
      currentFilters.platform === "" ||
      p.platform === currentFilters.platform;

    const matchTag =
      currentFilters.tag === "" ||
      (p.tags && p.tags.includes(currentFilters.tag));

    return matchSearch && matchPlatform && matchTag;
  });

  // Sort: starred first → copyCount desc → newest first
  filteredPrompts.sort((a, b) => {
    if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
    const countDiff = (b.copyCount || 0) - (a.copyCount || 0);
    if (countDiff !== 0) return countDiff;
    return new Date(b.savedAt) - new Date(a.savedAt);
  });
}

/* ─── Rendering ─── */
function renderPrompts() {
  const container = document.getElementById("promptsList");
  document.getElementById("countBadge").textContent = allPrompts.length;

  if (filteredPrompts.length === 0) {
    if (allPrompts.length === 0) {
      container.innerHTML = '<div class="empty-state">No prompts yet.<br>Select text on any page, right-click, save.</div>';
    } else {
      container.innerHTML = '<div class="empty-state">No matches.</div>';
    }
    return;
  }

  container.innerHTML = filteredPrompts.map(prompt => {
    const isEditing = editingId === prompt.id;
    return `<div class="prompt-card" data-id="${prompt.id}">${
      isEditing ? renderEditForm(prompt) : renderCardPreview(prompt)
    }</div>`;
  }).join("");

  filteredPrompts.forEach(prompt => attachCardListeners(prompt));
}

function renderCardPreview(prompt) {
  const sourceDomain = safeDomain(prompt.source);
  const relativeTime = getRelativeTime(new Date(prompt.savedAt));
  const platform = prompt.platform
    ? `<span class="meta-dot">·</span><span class="platform-pill">${escapeHtml(prompt.platform)}</span>`
    : "";
  const tagsHtml = prompt.tags?.length
    ? `<div class="tags-row">${prompt.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  if (pendingDelete === prompt.id) {
    return `
      <div class="undo-state">
        <span>Deleted</span>
        <button class="btn-undo" data-undo="${prompt.id}">Undo</button>
      </div>
    `;
  }

  const starTitle = prompt.starred ? "Remove from favourites" : "Add to favourites";

  return `
    <button class="star-btn${prompt.starred ? " starred" : ""}" data-star="${prompt.id}" title="${starTitle}">★</button>
    <div class="card-actions">
      <button class="icon-btn" data-copy="${prompt.id}" title="Copy">⧉</button>
      <button class="icon-btn" data-edit="${prompt.id}" title="Edit">✎</button>
      <button class="icon-btn danger" data-delete="${prompt.id}" title="Delete">×</button>
    </div>
    <div class="card-preview">${escapeHtml(prompt.text)}</div>
    <div class="card-meta">
      <span>${sourceDomain}</span>
      <span class="meta-dot">·</span>
      <span>${relativeTime}</span>
      ${platform}
    </div>
    ${tagsHtml}
  `;
}

function renderEditForm(prompt) {
  const selectedTags = prompt.tags || [];
  const selectedPlatform = prompt.platform || "";

  const platformPills = PLATFORMS.map(p => `
    <button class="pill ${p === selectedPlatform ? "selected" : ""}" data-platform="${p}">${p}</button>
  `).join("");

  const presetPills = PRESET_TAGS.map(tag => `
    <button class="pill ${selectedTags.includes(tag) ? "selected" : ""}" data-preset-tag="${tag}">#${tag}</button>
  `).join("");

  const customTagsHtml = selectedTags
    .filter(t => !PRESET_TAGS.includes(t))
    .map(t => `
      <span class="custom-tag">
        #${escapeHtml(t)}
        <span class="remove-tag" data-remove-tag="${escapeHtml(t)}">×</span>
      </span>
    `)
    .join("");

  return `
    <div class="edit-container">
      <div class="form-group">
        <label class="form-label">Prompt</label>
        <textarea class="prompt-textarea" data-prompt-text>${escapeHtml(prompt.text)}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Tags</label>
        <div class="pill-group">${presetPills}</div>
        <input type="text" class="custom-tag-input" data-custom-tag-input placeholder="Add custom tag, press Enter">
        <div class="custom-tags-list" data-custom-tags>${customTagsHtml}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Platform</label>
        <div class="pill-group">${platformPills}</div>
      </div>

      <div class="edit-buttons">
        <button class="btn-ghost" data-cancel="${prompt.id}">Cancel</button>
        <button class="btn-primary" data-save="${prompt.id}">Save</button>
      </div>
    </div>
  `;
}

function attachCardListeners(prompt) {
  const card = document.querySelector(`.prompt-card[data-id="${prompt.id}"]`);
  if (!card) return;

  const starBtn = card.querySelector(`[data-star="${prompt.id}"]`);
  const copyBtn = card.querySelector(`[data-copy="${prompt.id}"]`);
  const editBtn = card.querySelector(`[data-edit="${prompt.id}"]`);
  const deleteBtn = card.querySelector(`[data-delete="${prompt.id}"]`);
  const undoBtn = card.querySelector(`[data-undo="${prompt.id}"]`);

  if (starBtn) starBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleStar(prompt.id);
  });

  if (copyBtn) copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyToClipboard(prompt.text, copyBtn, prompt.id);
  });
  if (editBtn) editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startEdit(prompt.id);
  });
  if (deleteBtn) deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deletePrompt(prompt.id);
  });
  if (undoBtn) undoBtn.addEventListener("click", () => {
    if (deleteTimer) clearTimeout(deleteTimer);
    pendingDelete = null;
    deleteTimer = null;
    renderPrompts();
  });

  if (editingId === prompt.id) attachEditListeners(card, prompt);
}

function attachEditListeners(card, prompt) {
  card.querySelectorAll(".pill[data-platform]").forEach(btn => {
    btn.addEventListener("click", () => {
      const wasSelected = btn.classList.contains("selected");
      card.querySelectorAll(".pill[data-platform]").forEach(b => b.classList.remove("selected"));
      if (!wasSelected) btn.classList.add("selected");
    });
  });

  card.querySelectorAll(".pill[data-preset-tag]").forEach(btn => {
    btn.addEventListener("click", () => btn.classList.toggle("selected"));
  });

  card.querySelectorAll(".remove-tag").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".custom-tag").remove());
  });

  const customTagInput = card.querySelector(".custom-tag-input");
  const customTagsList = card.querySelector("[data-custom-tags]");
  if (customTagInput && customTagsList) {
    customTagInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.target.value.trim()) {
        e.preventDefault();
        const tag = e.target.value.trim().toLowerCase();
        const exists = Array.from(customTagsList.querySelectorAll(".custom-tag"))
          .some(t => t.textContent.includes(`#${tag}`));
        if (!exists) {
          const tagEl = document.createElement("span");
          tagEl.className = "custom-tag";
          tagEl.innerHTML = `#${escapeHtml(tag)} <span class="remove-tag">×</span>`;
          tagEl.querySelector(".remove-tag").addEventListener("click", () => tagEl.remove());
          customTagsList.appendChild(tagEl);
        }
        e.target.value = "";
      }
    });
  }

  const cancelBtn = card.querySelector(`[data-cancel="${prompt.id}"]`);
  const saveBtn = card.querySelector(`[data-save="${prompt.id}"]`);
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    editingId = null;
    renderPrompts();
  });
  if (saveBtn) saveBtn.addEventListener("click", () => saveEdit(prompt.id));
}

function startEdit(id) {
  editingId = id;
  renderPrompts();
}

async function saveEdit(id) {
  const card = document.querySelector(`.prompt-card[data-id="${id}"]`);
  if (!card) return;

  const newText = card.querySelector(".prompt-textarea").value;
  const selectedPresets = Array.from(card.querySelectorAll(".pill[data-preset-tag].selected"))
    .map(b => b.dataset.presetTag);
  const customTags = Array.from(card.querySelectorAll("[data-custom-tags] .custom-tag"))
    .map(t => t.textContent.replace("×", "").trim().slice(1));
  const newTags = [...selectedPresets, ...customTags];
  const selectedPlatformBtn = card.querySelector(".pill[data-platform].selected");
  const newPlatform = selectedPlatformBtn ? selectedPlatformBtn.dataset.platform : null;

  const idx = allPrompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    allPrompts[idx].text = newText;
    allPrompts[idx].tags = newTags;
    allPrompts[idx].platform = newPlatform;
    await chrome.storage.local.set({ prompts: allPrompts });
    editingId = null;
    applyFilters();
    renderChipRow();
    renderPrompts();
  }
}

async function deletePrompt(id) {
  pendingDelete = id;
  renderPrompts();
  if (deleteTimer) clearTimeout(deleteTimer);
  deleteTimer = setTimeout(async () => {
    allPrompts = allPrompts.filter(p => p.id !== id);
    await chrome.storage.local.set({ prompts: allPrompts });
    pendingDelete = null;
    deleteTimer = null;
    applyFilters();
    renderChipRow();
    renderPrompts();
  }, 3000);
}

async function toggleStar(id) {
  const idx = allPrompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    allPrompts[idx].starred = !allPrompts[idx].starred;
    await chrome.storage.local.set({ prompts: allPrompts });
    applyFilters();
    renderPrompts();
  }
}

function copyToClipboard(text, btn, promptId) {
  navigator.clipboard.writeText(text).then(async () => {
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => { btn.textContent = original; }, 1000);
    }
    if (promptId) {
      const idx = allPrompts.findIndex(p => p.id === promptId);
      if (idx !== -1) {
        allPrompts[idx].copyCount = (allPrompts[idx].copyCount || 0) + 1;
        await chrome.storage.local.set({ prompts: allPrompts });
        applyFilters();
        renderPrompts();
      }
    }
  });
}

/* ─── Utils ─── */
function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function getRelativeTime(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
