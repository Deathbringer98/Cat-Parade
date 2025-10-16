let activeTabId = null;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  
  // If there's an active tab with the cat parade, close it first
  if (activeTabId && activeTabId !== tab.id) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        func: () => {
          const existing = document.getElementById("cat-parade-box");
          if (existing) existing.remove();
        }
      });
    } catch (e) {
      // Tab might be closed, ignore error
      console.log("Previous tab no longer accessible");
    }
  }
  
  // Toggle on current tab
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
  
  // Update active tab
  activeTabId = tab.id;
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
  }
});
