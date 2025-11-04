// AI Bookmark Organizer - Background Service Worker

let config = {
  apiKey: '',
  apiUrl: 'http://localhost:3000',
  model: 'anthropic/claude-3.5-sonnet',
  autoOrganize: true
};

// Load configuration on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Bookmark Organizer installed');
  await loadConfig();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadConfig();
});

// Load config from storage
async function loadConfig() {
  const stored = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'model', 'autoOrganize']);
  config = {
    apiKey: stored.apiKey || '',
    apiUrl: stored.apiUrl || 'http://localhost:3000',
    model: stored.model || 'anthropic/claude-3.5-sonnet',
    autoOrganize: stored.autoOrganize !== false
  };
  console.log('Config loaded:', { ...config, apiKey: config.apiKey ? '***' : 'not set' });
}

// Listen for config changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.apiKey) config.apiKey = changes.apiKey.newValue;
    if (changes.apiUrl) config.apiUrl = changes.apiUrl.newValue;
    if (changes.model) config.model = changes.model.newValue;
    if (changes.autoOrganize) config.autoOrganize = changes.autoOrganize.newValue;
  }
});

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await saveBookmarkWithAI(tab);
    }
  } else if (command === 'open-search') {
    chrome.action.openPopup();
  }
});

// Intercept bookmark creation (via context menu, Ctrl+D, etc.)
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  console.log('Bookmark created:', bookmark);

  // Only process if auto-organize is enabled
  if (!config.autoOrganize) return;

  // Check if this is a URL bookmark (not a folder)
  if (bookmark.url) {
    await handleBookmarkCreation(id, bookmark);
  }
});

// Handle new bookmark with AI
async function handleBookmarkCreation(chromeBookmarkId, chromeBookmark) {
  try {
    // Get current tab info for better context
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const bookmarkData = {
      url: chromeBookmark.url,
      title: chromeBookmark.title || tab?.title || 'Untitled',
      description: '',
      fetchContent: true
    };

    // Send to our backend for AI processing
    const response = await fetch(`${config.apiUrl}/api/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...bookmarkData,
        apiKey: config.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Store the mapping between Chrome bookmark ID and our database ID
    await chrome.storage.local.set({
      [`bookmark_${chromeBookmarkId}`]: result.data.id
    });

    // Show notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Bookmark Organized',
      message: `Categorized as: ${result.analysis.category}\n${result.analysis.explanation}`,
      priority: 1
    });

    console.log('Bookmark processed:', result);
  } catch (error) {
    console.error('Error processing bookmark:', error);

    // Show error notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Bookmark Error',
      message: `Failed to organize bookmark: ${error.message}`,
      priority: 2
    });
  }
}

// Save bookmark with AI (manual trigger)
async function saveBookmarkWithAI(tab) {
  try {
    const bookmarkData = {
      url: tab.url,
      title: tab.title,
      description: '',
      fetchContent: true
    };

    // Show loading notification
    const notificationId = await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Analyzing Bookmark...',
      message: 'AI is analyzing the page...',
      priority: 1
    });

    // Send to backend
    const response = await fetch(`${config.apiUrl}/api/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...bookmarkData,
        apiKey: config.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Clear loading notification
    chrome.notifications.clear(notificationId);

    // Show result notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Bookmark Saved',
      message: `Category: ${result.analysis.category}\n${result.analysis.explanation}`,
      priority: 1
    });

    // Also create Chrome bookmark for sync
    await chrome.bookmarks.create({
      title: bookmarkData.title,
      url: bookmarkData.url
    });

  } catch (error) {
    console.error('Error saving bookmark:', error);
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Error',
      message: `Failed to save bookmark: ${error.message}`,
      priority: 2
    });
  }
}

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveBookmark') {
    saveBookmarkWithAI(request.tab)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'getConfig') {
    sendResponse({ success: true, config });
    return true;
  }

  if (request.action === 'updateConfig') {
    chrome.storage.sync.set(request.config)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// API helper functions for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'apiRequest') {
    makeApiRequest(request.endpoint, request.method, request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function makeApiRequest(endpoint, method = 'GET', data = null) {
  const url = `${config.apiUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify({
      ...data,
      apiKey: config.apiKey
    });
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || response.statusText);
  }

  return await response.json();
}

console.log('AI Bookmark Organizer background service worker loaded');
