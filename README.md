# Prompt Vault — Chrome Extension

A simple Chrome extension to save, organize, and manage prompts you find on the web.

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `PromptVault` folder
5. The extension should now appear in your Chrome toolbar

## Usage

### Save a Prompt
1. Select any text on a webpage (e.g., from X, Reddit, blogs, etc.)
2. Right-click and select **"Send to Prompt Vault"**
3. A green toast notification will confirm the save
4. Open the Prompt Vault popup to view it

### View & Manage Prompts
1. Click the Prompt Vault icon in your Chrome toolbar
2. The popup shows all your saved prompts with:
   - Prompt preview (first 120 characters)
   - Source domain and time saved
   - Platform badge (if set)
   - Tags

### Edit a Prompt
1. Click **Edit** on any prompt card
2. Edit the prompt text
3. Add tags:
   - Click preset tags (coding, writing, image, research, productivity)
   - Or type custom tags and press Enter
4. Select which AI platform works best (ChatGPT, Claude, Gemini, Midjourney, Grok)
5. Click **Save**

### Delete a Prompt
1. Click **Delete** on any prompt
2. You have 3 seconds to click **Undo** to recover it
3. If you do nothing, it's permanently deleted

### Search & Filter
- **Text search**: Type in the search box to find prompts by content or page title
- **Platform filter**: Use the dropdown to show prompts for a specific AI platform
- **Tag filter**: Click a tag chip to filter by that tag

### Toggle Theme
- Click the sun/moon button (☀️/🌙) in the header to switch between light and dark mode
- Your preference is saved and persists across sessions

## Features

✅ Save prompts with one right-click  
✅ Organize with tags and platform labels  
✅ Search and filter by multiple criteria  
✅ Light/Dark theme toggle  
✅ Edit and delete prompts  
✅ 3-second undo on delete  
✅ All data stored locally (no cloud sync)  

## File Structure

```
PromptVault/
├── manifest.json       # Extension config (MV3)
├── background.js       # Service worker
├── content.js          # Toast notifications
├── popup.html          # UI
├── popup.js            # Logic
├── popup.css           # Styling
├── icons/              # Extension icons
└── README.md           # This file
```

## Storage

All prompts and settings are stored locally in `chrome.storage.local`. Nothing is sent to any server.

Prompt object structure:
```js
{
  id: "uuid",
  text: "prompt text",
  source: "https://...",
  title: "Page title",
  savedAt: "2026-05-26T10:00:00Z",
  tags: ["coding", "gpt"],
  platform: "ChatGPT"
}
```

## Troubleshooting

**Toast notification not showing?**
- Make sure content scripts are enabled for the site
- Some sites with strict CSP might block the toast

**Search not finding prompts?**
- Search is case-insensitive and matches both prompt text and page title

**Undo button not appearing?**
- The undo button appears automatically when you delete. Click it within 3 seconds.

## Future Ideas

- Export/import prompts
- Cloud sync
- Prompt categories
- Duplicate detection
- AI platform recommendations
- Keyboard shortcuts
# Prompt-Vault
