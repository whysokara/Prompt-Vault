# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prompt Vault** is a Chrome extension (Manifest V3) that lets users save, organize, and manage prompts they find on the web. The extension uses `chrome.storage.local` for persistence — no backend required.

## Getting Started

### Loading the Extension (Development)
```bash
# 1. Open chrome://extensions/
# 2. Toggle "Developer Mode" (top-right corner)
# 3. Click "Load unpacked"
# 4. Select /Users/kara/Desktop/PromptVault/
```

### Testing Workflow
1. **Save**: Select text anywhere → right-click → "Send to Prompt Vault" → green toast confirms
2. **View**: Click extension icon → popup shows all prompts, newest first
3. **Edit**: Click Edit on any card → modify text/tags/platform → Save
4. **Search**: Use search box or platform/tag filters to narrow down
5. **Delete**: Click Delete → Undo appears for 3 seconds, or auto-delete after timeout

To reload after code changes: Open `chrome://extensions/` and click the refresh icon on Prompt Vault.

## Architecture

### Data Model

All data stored in `chrome.storage.local`:

```js
// Prompts array
{
  prompts: [
    {
      id: "uuid",                    // crypto.randomUUID()
      text: "full prompt text",       // selected text from webpage
      source: "https://x.com/...",   // tab.url
      title: "Page Title",            // tab.title
      savedAt: "2026-05-26T...",     // ISO timestamp
      tags: ["coding", "custom"],     // array of tag strings (preset or custom)
      platform: "ChatGPT"             // one of: ChatGPT, Claude, Gemini, Midjourney, Grok, or null
    }
  ],
  theme: "light" | "dark"             // user preference
}
```

### Core Flows

**Saving a Prompt:**
1. User selects text and right-clicks
2. `background.js` catches the context menu click
3. Builds prompt object from `info.selectionText`, `tab.url`, `tab.title`
4. Prepends to prompts array in `chrome.storage.local`
5. Sends message to `content.js` to show toast notification

**Editing a Prompt:**
1. User clicks Edit on a card
2. `popup.js` sets `editingId = promptId` and re-renders
3. Card expands inline to show edit form (text, tags, platform)
4. User modifies and clicks Save
5. Updated prompt replaces old one in `allPrompts` array
6. Storage updated, filters re-applied, UI re-rendered

**Deleting a Prompt:**
1. User clicks Delete
2. `popup.js` sets `pendingDelete = promptId` and renders with faded appearance + Undo button
3. A 3-second timer starts
4. If Undo clicked: timer cleared, `pendingDelete` reset, normal render
5. If timer expires: prompt filtered out of `allPrompts`, storage updated

**Filtering:**
- Text search: filters by `prompt.text` and `prompt.title` (case-insensitive)
- Platform filter: shows only prompts with matching `platform`
- Tag filter: shows only prompts where `tags` array includes selected tag
- Filters apply independently (all must match)

### File-by-File Guide

| File | Purpose | Key Details |
|------|---------|-------------|
| `manifest.json` | MV3 config | Defines permissions, service worker, content scripts, popup |
| `background.js` | Service worker | Context menu registration, save logic, messaging to content script |
| `content.js` | Content script (runs on all sites) | Listens for save message, injects toast notification with CSS animations |
| `popup.html` | Popup UI template | Header, search/filters, prompts list container |
| `popup.js` | Popup logic (1000+ lines) | State management, rendering, edit/delete/search, theme toggle |
| `popup.css` | Popup styling | Light/dark theme via CSS custom properties, card layout, animations |
| `icons/icon.svg` | Extension icon | Referenced in manifest |

## Key Implementation Details

### Preset vs. Custom Tags
- **Preset tags**: Hard-coded in `PRESET_TAGS` array (`["coding", "writing", "image", "research", "productivity"]`)
- **Custom tags**: User types them in edit form, added to `tags` array
- Edit form shows both: preset tag buttons + custom tag input field
- Both types stored identically in prompt object

### Theme System
- CSS custom properties (`--bg-primary`, `--text-primary`, etc.) defined in `:root` and `[data-theme="dark"]`
- `<body data-theme="light">` toggles themes via attribute
- Theme persisted in `chrome.storage.local` and loaded on popup open

### Edit Mode
- No separate edit page — edit form renders inline in the same card
- When `editingId === prompt.id`, card shows edit form instead of preview
- Editable fields: prompt text (textarea), tags (preset + custom), platform (buttons)
- Both Cancel and Save re-render the list (Cancel without saving changes)

### Toast Notifications
- Injected by `content.js` only when user saves (on-demand, not persistent)
- Uses CSS animations (`@keyframes slideIn/slideOut`) for smooth appearance/fade
- Top-right corner, auto-removes after 2 seconds
- Green background, white text

### Performance Considerations
- `allPrompts` loaded once on popup open, not re-fetched per action
- `chrome.storage.local.set()` is async but not awaited in background.js (fire-and-forget for save)
- Search/filter happens in-memory on `allPrompts` (not queried against storage)
- Re-rendering full list on every change (acceptable since typical vault is <100 prompts)

## Common Development Tasks

### Adding a New AI Platform
1. Add to `PLATFORMS` array in `popup.js`
2. Platform picker buttons are generated from this array in the edit form
3. No other changes needed (platform is just a string field)

### Changing Preset Tags
1. Edit `PRESET_TAGS` array in `popup.js`
2. Tag filter and edit form will automatically reflect the change
3. Existing custom tags in saved prompts are unaffected

### Modifying the Toast Notification
- Edit the `showToast()` function in `content.js`
- CSS animations are in `<style>` injected in the same function
- To change duration, modify the `setTimeout` call (currently 2000ms)

### Adding a New Filter Type
1. Add to `currentFilters` object in `popup.js`
2. Add filter UI element (input, select, etc.) to `popup.html`
3. Add event listener in `setupEventListeners()`
4. Add filter logic to `applyFilters()` function
5. Call `renderPrompts()` after filter changes

### Styling Changes
- All colors and spacing use CSS custom properties (no hard-coded hex/px values)
- Light/dark theme colors defined in `:root` and `[data-theme="dark"]`
- To change theme colors, update the CSS custom properties at the top of `popup.css`

## Debugging Tips

**Extension not showing in Chrome?**
- Ensure manifest.json is valid JSON: `python3 -m json.tool manifest.json`
- Check `chrome://extensions/` error messages (reload the page if you don't see errors)

**Changes not appearing after editing?**
- Reload the extension: go to `chrome://extensions/` and click the refresh icon on Prompt Vault
- Open DevTools on the popup: Right-click the extension icon → Inspect popup
- Check for JavaScript errors in the console

**Toast not showing?**
- Some websites with strict Content Security Policy (CSP) may block injected DOM
- Check the website's CSP headers
- Content script should still save the prompt (toast is just UI feedback)

**Data not persisting?**
- Check `chrome://extensions/` to ensure extension has storage permission
- Open DevTools, go to Storage tab → Chrome Storage → Local → check for "prompts" and "theme" keys
- Prompts are keyed as `prompts` (array) and `theme` (string)

**Editing form not showing?**
- Check browser console for JavaScript errors
- Verify that `editingId` is being set correctly
- Check that `renderEditForm()` HTML is valid

## Important Constraints

- **Manifest V3**: No eval, no external scripts, no background pages (only service workers)
- **Content script injection**: Limited to on-demand toast (not persistent DOM)
- **Storage quota**: `chrome.storage.local` has per-extension limits (~10MB), but vault should be fine for thousands of prompts
- **Platform support**: Chrome extension API — works on Chrome, Edge, Brave, etc. Not compatible with Firefox (would need WebExtensions API)

## Testing the Extension

### Manual Test Checklist
- [ ] Right-click on selected text → "Send to Prompt Vault" appears
- [ ] Toast notification shows after saving
- [ ] Popup displays the saved prompt with correct text, URL, timestamp
- [ ] Edit form appears when clicking Edit
- [ ] Preset and custom tags work in edit form
- [ ] Platform selector works
- [ ] Save persists changes and re-renders
- [ ] Delete → Undo works within 3 seconds
- [ ] Delete → timeout works after 3 seconds
- [ ] Search filters by text
- [ ] Platform filter narrows results
- [ ] Tag filter narrows results
- [ ] Dark/Light theme toggle persists across popup close/open
- [ ] Multiple prompts render in correct order (newest first)
- [ ] Copy button copies full prompt text to clipboard

### Known Limitations
- No batch operations (select multiple, bulk delete, etc.)
- No export/import
- No cloud sync
- No keyboard shortcuts
- Tags are just strings (no autocomplete, no hierarchy)
- No duplicate detection
