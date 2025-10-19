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
  
  // Inject scripts sequentially with proper error handling
  try {
    // First inject extension URL helper
    console.log("Injecting extension URL helper...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (extensionId) => {
        window.CAT_EXTENSION_ID = extensionId;
        window.getExtensionURL = (path) => `chrome-extension://${extensionId}/${path}`;
        console.log('Extension URL helper injected with ID:', extensionId);
      },
      args: [chrome.runtime.id]
    });
    
    console.log("Injecting cat-parade.js...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["cat-parade.js"],
    });
    
    console.log("Injecting cat-asteroids.js...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["cat-asteroids.js"],
    });
    
    console.log("Injecting content.js...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    
    console.log("All scripts injected successfully");
  } catch (error) {
    console.error("Failed to inject scripts:", error);
    
    // Fallback: inject inline code
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          alert("Extension files could not be loaded. Please check if the extension is properly installed and try again.");
        }
      });
    } catch (fallbackError) {
      console.error("Even fallback failed:", fallbackError);
    }
  }
  
  // Update active tab
  activeTabId = tab.id;
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
  }
});
