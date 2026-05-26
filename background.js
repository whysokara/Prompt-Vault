chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-vault",
    title: "Send to Prompt Vault",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-to-vault") {
    // Show save modal on the page
    chrome.tabs.sendMessage(tab.id, {
      type: "show-save-modal",
      data: {
        text: info.selectionText,
        source: tab.url,
        title: tab.title
      }
    }).catch(() => {
      // If content script not loaded, show toast and exit
      chrome.tabs.sendMessage(tab.id, {
        type: "show-toast",
        message: "Reload the page and try again"
      });
    });
  }
});

// Listen for save prompt message from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "save-prompt") {
    savePrompt(request.data, sender.tab.id);
    sendResponse({ status: "prompt-saved" });
  }
});

async function savePrompt(data, tabId) {
  const prompt = {
    id: crypto.randomUUID(),
    text: data.text,
    source: data.source,
    title: data.title,
    savedAt: new Date().toISOString(),
    tags: data.tags || [],
    platform: data.platform || null
  };

  const { prompts = [] } = await chrome.storage.local.get("prompts");
  prompts.unshift(prompt);
  await chrome.storage.local.set({ prompts });

  chrome.tabs.sendMessage(tabId, {
    type: "show-toast",
    message: "✓ Saved to Prompt Vault"
  }).catch(() => {
    // Tab might be closed, ignore
  });
}
