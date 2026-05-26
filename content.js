const PRESET_TAGS = ["coding", "writing", "image", "research", "productivity"];
const PLATFORMS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "Grok"];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "show-save-modal") {
    showSaveCard(request.data);
    sendResponse({ status: "modal-shown" });
  } else if (request.type === "show-toast") {
    showToast(request.message);
    sendResponse({ status: "toast-shown" });
  }
});

function showSaveCard(data) {
  document.getElementById("prompt-vault-card")?.remove();

  // Detect dark mode — use Claude's exact design tokens
  const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const c = isDark ? {
    bg:          "#1a1714",
    bgSubtle:    "#1f1e1b",
    bgHover:     "#2d2b27",
    border:      "rgba(250,249,245,0.09)",
    borderFocus: "rgba(204,120,92,0.6)",
    fg:          "#faf9f5",
    fgMuted:     "#9c9a92",
    fgSubtle:    "#73726c",
    accent:      "#cc785c",
    accentMuted: "rgba(204,120,92,0.15)",
    shadow:      "0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(250,249,245,0.06)"
  } : {
    bg:          "#faf9f5",
    bgSubtle:    "#f5f0e8",
    bgHover:     "#e8e0d2",
    border:      "#e6dfd8",
    borderFocus: "rgba(204,120,92,0.5)",
    fg:          "#141413",
    fgMuted:     "#6c6a64",
    fgSubtle:    "#8e8b82",
    accent:      "#cc785c",
    accentMuted: "rgba(204,120,92,0.10)",
    shadow:      "0 8px 24px rgba(20,20,19,0.12), 0 0 0 1px rgba(20,20,19,0.06)"
  };

  injectStyles(c);

  const root = document.createElement("div");
  root.id = "prompt-vault-card";
  root.innerHTML = `
    <div class="pv-card">
      <div class="pv-head">
        <span class="pv-title">Save prompt</span>
        <button class="pv-x" id="pv-close" aria-label="Close">×</button>
      </div>

      <div class="pv-preview" id="pv-preview"></div>

      <div class="pv-group">
        <div class="pv-label">Tags</div>
        <div class="pv-pills" id="pv-preset-tags"></div>
        <input class="pv-input" id="pv-tag-input" type="text" placeholder="Add tag, press Enter">
        <div class="pv-custom-tags" id="pv-custom-tags"></div>
      </div>

      <div class="pv-group">
        <div class="pv-label">Platform</div>
        <div class="pv-pills" id="pv-platforms"></div>
      </div>

      <div class="pv-actions">
        <button class="pv-btn-ghost" id="pv-cancel">Cancel</button>
        <button class="pv-btn-primary" id="pv-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Populate preview
  document.getElementById("pv-preview").textContent = data.text;

  const selectedTags = new Set();
  let selectedPlatform = null;

  // Preset tag pills
  const presetEl = document.getElementById("pv-preset-tags");
  PRESET_TAGS.forEach(tag => {
    const b = document.createElement("button");
    b.className = "pv-pill";
    b.textContent = `#${tag}`;
    b.addEventListener("click", (e) => {
      e.preventDefault();
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        b.classList.remove("selected");
      } else {
        selectedTags.add(tag);
        b.classList.add("selected");
      }
    });
    presetEl.appendChild(b);
  });

  // Custom tag input
  const tagInput = document.getElementById("pv-tag-input");
  const customTagsEl = document.getElementById("pv-custom-tags");
  tagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && tagInput.value.trim()) {
      e.preventDefault();
      const tag = tagInput.value.trim().toLowerCase();
      if (!selectedTags.has(tag)) {
        selectedTags.add(tag);
        const el = document.createElement("span");
        el.className = "pv-custom-tag";
        el.innerHTML = `#${escapeHtml(tag)}<button class="pv-rm" aria-label="Remove">×</button>`;
        el.querySelector(".pv-rm").addEventListener("click", (ev) => {
          ev.preventDefault();
          selectedTags.delete(tag);
          el.remove();
        });
        customTagsEl.appendChild(el);
      }
      tagInput.value = "";
    }
  });

  // Platform pills
  const platformsEl = document.getElementById("pv-platforms");
  PLATFORMS.forEach(p => {
    const b = document.createElement("button");
    b.className = "pv-pill";
    b.textContent = p;
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const wasSelected = b.classList.contains("selected");
      platformsEl.querySelectorAll(".pv-pill").forEach(x => x.classList.remove("selected"));
      if (!wasSelected) {
        b.classList.add("selected");
        selectedPlatform = p;
      } else {
        selectedPlatform = null;
      }
    });
    platformsEl.appendChild(b);
  });

  // Close handlers
  const close = () => {
    root.classList.add("pv-leaving");
    setTimeout(() => root.remove(), 180);
    document.removeEventListener("keydown", escHandler);
  };
  const escHandler = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", escHandler);

  document.getElementById("pv-close").addEventListener("click", close);
  document.getElementById("pv-cancel").addEventListener("click", close);

  // Save
  document.getElementById("pv-save").addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "save-prompt",
      data: {
        text: data.text,
        source: data.source,
        title: data.title,
        tags: Array.from(selectedTags),
        platform: selectedPlatform
      }
    });

    // Confirmation state
    const card = root.querySelector(".pv-card");
    card.innerHTML = `
      <div class="pv-saved">
        <span class="pv-dot"></span>
        <span>Saved</span>
      </div>
    `;
    setTimeout(close, 900);
  });

  // Trigger slide-in
  requestAnimationFrame(() => root.classList.add("pv-in"));
}

function injectStyles(c) {
  document.getElementById("pv-styles")?.remove();
  const style = document.createElement("style");
  style.id = "pv-styles";
  style.textContent = `
    #prompt-vault-card {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      z-index: 2147483647;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    #prompt-vault-card.pv-in  { opacity: 1; transform: translateY(0); }
    #prompt-vault-card.pv-leaving { opacity: 0; transform: translateY(8px); }

    #prompt-vault-card .pv-card {
      background: ${c.bg};
      border: 1px solid ${c.border};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${c.shadow};
      color: ${c.fg};
    }
    #prompt-vault-card .pv-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    #prompt-vault-card .pv-title {
      font-size: 13px;
      font-weight: 600;
      color: ${c.fg};
      letter-spacing: -0.1px;
    }
    #prompt-vault-card .pv-x {
      width: 22px; height: 22px;
      border-radius: 6px; border: none;
      background: transparent; cursor: pointer;
      color: ${c.fgMuted}; font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    #prompt-vault-card .pv-x:hover { background: ${c.bgHover}; color: ${c.fg}; }

    #prompt-vault-card .pv-preview {
      font-size: 12px;
      color: ${c.fgMuted};
      background: ${c.bgSubtle};
      border: 1px solid ${c.border};
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      line-height: 1.55;
    }
    #prompt-vault-card .pv-group { margin-bottom: 12px; }
    #prompt-vault-card .pv-label {
      font-size: 10px; font-weight: 600;
      color: ${c.fgSubtle}; margin-bottom: 6px;
      text-transform: uppercase; letter-spacing: 0.6px; display: block;
    }
    #prompt-vault-card .pv-pills {
      display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px;
    }
    #prompt-vault-card .pv-pill {
      padding: 4px 10px;
      border: 1px solid ${c.border};
      border-radius: 9999px;
      font-size: 11px; font-weight: 500;
      color: ${c.fgMuted};
      background: transparent;
      cursor: pointer;
      transition: all 0.15s; font-family: inherit;
    }
    #prompt-vault-card .pv-pill:hover {
      border-color: ${c.accent};
      color: ${c.accent};
      background: ${c.accentMuted};
    }
    #prompt-vault-card .pv-pill.selected {
      background: ${c.accent}; color: #fff; border-color: ${c.accent};
    }
    #prompt-vault-card .pv-input {
      width: 100%; padding: 7px 10px;
      border: 1px solid ${c.border}; border-radius: 8px;
      font-size: 12px; background: ${c.bg}; color: ${c.fg};
      outline: none; font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    #prompt-vault-card .pv-input:focus {
      border-color: ${c.accent};
      box-shadow: 0 0 0 3px ${c.accentMuted};
    }
    #prompt-vault-card .pv-custom-tags {
      display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px;
    }
    #prompt-vault-card .pv-custom-tag {
      background: ${c.accent}; color: #fff;
      padding: 4px 8px; border-radius: 9999px;
      font-size: 11px; font-weight: 500;
      display: inline-flex; align-items: center; gap: 4px;
    }
    #prompt-vault-card .pv-rm {
      background: none; border: none; color: inherit;
      cursor: pointer; padding: 0; font-size: 13px; line-height: 1; opacity: 0.7;
    }
    #prompt-vault-card .pv-rm:hover { opacity: 1; }

    #prompt-vault-card .pv-actions {
      display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px;
    }
    #prompt-vault-card .pv-btn-ghost,
    #prompt-vault-card .pv-btn-primary {
      padding: 7px 14px; border-radius: 6px;
      font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; font-family: inherit;
      transition: all 0.15s;
    }
    #prompt-vault-card .pv-btn-ghost {
      color: ${c.fgMuted}; background: transparent;
    }
    #prompt-vault-card .pv-btn-ghost:hover {
      background: ${c.bgHover}; color: ${c.fg};
    }
    #prompt-vault-card .pv-btn-primary {
      background: ${c.accent}; color: #fff;
    }
    #prompt-vault-card .pv-btn-primary:hover { opacity: 0.88; }

    #prompt-vault-card .pv-saved {
      display: flex; align-items: center; gap: 8px;
      color: ${c.fg}; font-size: 13px; font-weight: 500; padding: 4px 0;
    }
    #prompt-vault-card .pv-dot {
      width: 6px; height: 6px; border-radius: 50%; background: ${c.accent};
    }
  `;
  document.head.appendChild(style);
}

function showToast(message) {
  const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const bg = isDark ? "#faf9f5" : "#141413";
  const fg = isDark ? "#141413" : "#faf9f5";

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bg};
    color: ${fg};
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Text", "Segoe UI", sans-serif;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.18s ease, transform 0.18s ease;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 200);
  }, 1800);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
