# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prompt Vault** is a Chrome extension (Manifest V3) that lets users save, organize, and manage prompts found on the web. No backend — all data lives in `chrome.storage.local`.

## Getting Started

```bash
# Load unpacked in Chrome
# 1. chrome://extensions/ → enable Developer Mode
# 2. Load unpacked → select /Users/kara/Desktop/PromptVault/
# 3. After any code change: click the refresh icon on the extension card
```

### Testing Workflow
1. **Save**: Select text → right-click → "Send to Prompt Vault" → slim card appears bottom-right of the page
2. **Tag + platform**: Add in the save card before clicking Save
3. **View**: Click toolbar icon → 360×480 popup, newest prompts first
4. **Edit**: Hover a card → click ✎ → card expands inline
5. **Delete**: Hover → × → Undo appears for 3 seconds
6. **Filter**: Search input + platform/tag chips in the chip row

## Architecture

### Data Model

```js
// chrome.storage.local keys
{
  prompts: [
    {
      id: "uuid",               // crypto.randomUUID()
      text: "full prompt text", // selected text
      source: "https://...",    // tab.url
      title: "Page Title",      // tab.title
      savedAt: "2026-05-26T…",  // ISO timestamp
      tags: ["coding", "custom"],
      platform: "ChatGPT"       // ChatGPT | Claude | Gemini | Midjourney | Grok | null
    }
  ],
  theme: "light" | "dark"
}
```

### Core Flows

**Saving a Prompt:**
1. User selects text, right-clicks → "Send to Prompt Vault"
2. `background.js` sends `show-save-modal` message to `content.js` with `{ text, source, title }`
3. `content.js` injects a slim save card (bottom-right, no backdrop) with tag/platform pickers
4. User fills in optional tags + platform, clicks Save
5. `content.js` sends `save-prompt` message back to `background.js`
6. `background.js` builds the prompt object, prepends to storage array
7. `content.js` receives `show-toast` message and shows a brief dark toast

**Editing a Prompt:**
1. User hovers card → action buttons appear → clicks ✎
2. `popup.js` sets `editingId` and re-renders that card as an inline edit form
3. Edit form: textarea + preset/custom tag pills + platform pills
4. Save: reads form state, updates `allPrompts[idx]`, writes to storage, re-renders

**Deleting:**
1. Hover card → ×
2. `pendingDelete = id`, card shows "Deleted / Undo"
3. 3-second timer → remove from `allPrompts`, write storage
4. Undo clears the timer

**Filtering:**
- All filters applied in-memory via `applyFilters()` on `allPrompts`
- `currentFilters = { search, platform, tag }` — all three must match

### File-by-File Guide

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 config — permissions, service worker, content scripts, popup |
| `background.js` | Context menu, save orchestration, message relay |
| `content.js` | Injects the save card + toast; all DOM scoped under `#prompt-vault-card` |
| `popup.html` | Minimal template — header, search input, chip row, list container |
| `popup.js` | All popup state and rendering — `allPrompts`, `filteredPrompts`, `editingId`, `pendingDelete` |
| `popup.css` | CSS custom property tokens, card/chip/pill layout |
| `icons/icon.svg` | Black rounded square with `[ ··· ]` glyph + green accent dot |

## Design System

**Reference:** Vercel/v0 — monochrome, minimal, no gradients.

**Tokens (popup.css):**
```css
/* Light */
--bg / --bg-subtle / --bg-hover
--fg / --fg-muted / --fg-subtle
--border / --border-strong
--accent: #10B981   /* used only as a 5-6px dot, nowhere else */
--danger: #E5484D

/* Dark — same names, inverted values */
```

**Rules:**
- No gradients, no colored backgrounds (accent dot is the only color)
- Corners: cards 14px, buttons/inputs 10px, chips/pills full pill (999px)
- Borders: 1px solid at very low opacity (`rgba(0,0,0,0.08)`)
- Card actions (copy/edit/delete) are **hover-only** — hidden at rest
- Save card in `content.js` uses inline CSS so it's self-contained and immune to page styles; it auto-detects `prefers-color-scheme`

## Common Development Tasks

### Adding a New Platform
Add to `PLATFORMS` in both `popup.js` and `content.js` — that's it. Both chip rows generate from that array.

### Adding a New Preset Tag
Edit `PRESET_TAGS` in both `popup.js` and `content.js`.

### Changing the Popup Size
Set `width` on `html, body` in `popup.css` and update `height` on `.container`.

### Modifying the Save Card
Edit `showSaveCard()` and `injectStyles()` in `content.js`. All card CSS lives in `injectStyles()` as a template string — no external stylesheet so page styles can't bleed in.

### Adding a New Filter
1. Add key to `currentFilters` in `popup.js`
2. Add a chip or input to `popup.html`
3. Wire it in `setupEventListeners()`
4. Add the condition to `applyFilters()`

## Debugging

**Save card not appearing:**
- Reload the extension, then reload the page (content scripts need a fresh page load)
- Check `chrome://extensions/` for service worker errors
- Some sites with strict CSP block injected DOM — toast/card won't appear but the save still works if background.js receives the message

**Popup shows stale data:**
- `allPrompts` is loaded once on popup open (`DOMContentLoaded`). Re-open the popup to reload.

**Validate manifest:**
```bash
python3 -m json.tool manifest.json
```

**Inspect popup DevTools:**
Right-click the extension icon → Inspect popup

## Constraints

- **MV3**: No `eval`, no remote scripts, service worker (not background page)
- **Content script isolation**: `#prompt-vault-card` and `#pv-styles` are the only persistent DOM nodes; both are removed on close
- **Storage**: `chrome.storage.local` ~10MB limit — fine for thousands of prompts
- **Browser support**: Chrome, Edge, Brave. Not Firefox (different WebExtension APIs)

## Test Checklist

- [ ] Right-click selected text → save card slides in bottom-right
- [ ] Page stays interactive behind the card (no backdrop dim)
- [ ] Escape closes the card
- [ ] Tags (preset + custom) and platform saved correctly
- [ ] Popup shows prompt with correct text, source domain, relative time, platform dot, tags
- [ ] Hover card → actions appear; un-hover → actions hide
- [ ] Copy → icon briefly shows ✓
- [ ] Edit inline → save → data persists after popup close/reopen
- [ ] Delete → Undo within 3s → prompt restored
- [ ] Delete → let expire → prompt gone
- [ ] Search by text
- [ ] Platform chip filter
- [ ] Tag chip filter (only visible when tags exist)
- [ ] Theme toggle persists
- [ ] Dark theme: black surfaces, white text
- [ ] Both themes: no beige, no gradients
