# Prompt Vault

A Chrome extension to save, organize, and revisit prompts you find on the web.

## Install (Development)

1. `chrome://extensions/` → enable **Developer Mode**
2. **Load unpacked** → select the `PromptVault` folder
3. Extension appears in your toolbar

## How It Works

### Save a Prompt
1. Select any text on a page (tweet, comment, blog post, etc.)
2. Right-click → **Send to Prompt Vault**
3. A slim card slides in from the bottom-right — no overlay, page stays interactive
4. Optionally add **tags** and pick which **AI platform** it works best on
5. Click **Save** — done

### View Your Prompts
Click the Prompt Vault icon to open the popup. Prompts are shown newest first with source, time, platform, and tags.

### Search & Filter
- Type in the search bar to find by content or page title
- Click a **platform chip** (ChatGPT, Claude, Gemini, Midjourney, Grok) to filter
- Click a **#tag chip** to filter by tag (chips appear once you have tags)

### Edit a Prompt
Hover any card → click **✎** → edit text, tags, or platform inline → Save.

### Delete a Prompt
Hover → click **×** → Undo appears for 3 seconds. After that it's gone.

### Theme
Click **◐** in the header to toggle light/dark. Preference is saved.

## Features

- Right-click save from any page
- Add tags and platform at save time
- Preset tags: coding, writing, image, research, productivity (+ custom)
- Platforms: ChatGPT, Claude, Gemini, Midjourney, Grok
- Inline edit, 3-second undo on delete
- Search + platform + tag filters
- Light/dark theme
- Everything stored locally — nothing sent to any server

## File Structure

```
PromptVault/
├── manifest.json     # MV3 config
├── background.js     # Service worker — context menu + save logic
├── content.js        # Save card + toast injected into pages
├── popup.html        # Popup template
├── popup.js          # Popup state and rendering
├── popup.css         # Design tokens + layout
├── icons/icon.svg    # Extension icon
├── CLAUDE.md         # Developer guide
└── README.md
```

## Storage

All data in `chrome.storage.local` — no server, no account needed.

```js
{
  id: "uuid",
  text: "prompt text",
  source: "https://x.com/...",
  title: "Page title",
  savedAt: "2026-05-26T10:00:00Z",
  tags: ["coding"],
  platform: "Claude"  // or null
}
```

## Troubleshooting

**Save card doesn't appear after right-click**
Reload the extension at `chrome://extensions/`, then reload the page. Content scripts load on page load, not extension reload.

**Changes to code not reflecting**
Reload the extension (refresh icon on the extension card), then re-open the popup or reload the page for content script changes.

**Toast/card blocked on some sites**
Sites with strict Content Security Policy (CSP) may block injected DOM. The prompt still saves — only the visual feedback is blocked.

## Future Ideas

- Export/import prompts
- Cloud sync
- Prompt categories
- Duplicate detection
- AI platform recommendations
- Keyboard shortcuts
