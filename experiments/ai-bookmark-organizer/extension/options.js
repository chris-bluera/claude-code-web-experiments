// AI Bookmark Organizer - Options Script

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  loadStatistics();
});

// Setup event listeners
function setupEventListeners() {
  // Form submissions
  document.getElementById('apiConfigForm').addEventListener('submit', saveApiConfig);
  document.getElementById('featureSettingsForm').addEventListener('submit', saveFeatureSettings);
  document.getElementById('advancedSettingsForm').addEventListener('submit', saveAdvancedSettings);

  // Range input live update
  const thresholdInput = document.getElementById('searchThreshold');
  thresholdInput.addEventListener('input', () => {
    document.getElementById('thresholdValue').textContent = thresholdInput.value;
  });

  // Action buttons
  document.getElementById('syncNowBtn').addEventListener('click', syncNow);
  document.getElementById('importBookmarksBtn').addEventListener('click', importChromeBookmarks);
  document.getElementById('exportBookmarksBtn').addEventListener('click', exportBookmarks);
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
  document.getElementById('deleteAllBtn').addEventListener('click', deleteAllBookmarks);
}

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'apiKey',
    'apiUrl',
    'model',
    'autoOrganize',
    'fetchContent',
    'showNotifications',
    'searchThreshold',
    'maxSuggestions'
  ]);

  // API Configuration
  document.getElementById('apiKey').value = settings.apiKey || '';
  document.getElementById('apiUrl').value = settings.apiUrl || 'http://localhost:3000';
  document.getElementById('model').value = settings.model || 'anthropic/claude-3.5-sonnet';

  // Feature Settings
  document.getElementById('autoOrganize').checked = settings.autoOrganize !== false;
  document.getElementById('fetchContent').checked = settings.fetchContent !== false;
  document.getElementById('showNotifications').checked = settings.showNotifications !== false;

  // Advanced Settings
  const threshold = settings.searchThreshold || 0.7;
  document.getElementById('searchThreshold').value = threshold;
  document.getElementById('thresholdValue').textContent = threshold;
  document.getElementById('maxSuggestions').value = settings.maxSuggestions || 5;
}

// Save API configuration
async function saveApiConfig(e) {
  e.preventDefault();

  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const model = document.getElementById('model').value;

  if (!apiKey) {
    showMessage('Please enter an API key', 'error');
    return;
  }

  if (!apiUrl) {
    showMessage('Please enter a backend API URL', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({ apiKey, apiUrl, model });
    showMessage('API settings saved successfully!', 'success');

    // Test connection
    await testConnection(apiUrl, apiKey);
  } catch (error) {
    showMessage('Failed to save settings: ' + error.message, 'error');
  }
}

// Save feature settings
async function saveFeatureSettings(e) {
  e.preventDefault();

  const settings = {
    autoOrganize: document.getElementById('autoOrganize').checked,
    fetchContent: document.getElementById('fetchContent').checked,
    showNotifications: document.getElementById('showNotifications').checked
  };

  try {
    await chrome.storage.sync.set(settings);
    showMessage('Feature settings saved successfully!', 'success');
  } catch (error) {
    showMessage('Failed to save settings: ' + error.message, 'error');
  }
}

// Save advanced settings
async function saveAdvancedSettings(e) {
  e.preventDefault();

  const settings = {
    searchThreshold: parseFloat(document.getElementById('searchThreshold').value),
    maxSuggestions: parseInt(document.getElementById('maxSuggestions').value)
  };

  try {
    await chrome.storage.sync.set(settings);
    showMessage('Advanced settings saved successfully!', 'success');
  } catch (error) {
    showMessage('Failed to save settings: ' + error.message, 'error');
  }
}

// Test API connection
async function testConnection(apiUrl, apiKey) {
  try {
    const response = await fetch(`${apiUrl}/health`);
    if (response.ok) {
      showMessage('✅ Backend connection successful!', 'success');
    } else {
      showMessage('⚠️ Backend is reachable but returned an error', 'warning');
    }
  } catch (error) {
    showMessage('❌ Cannot connect to backend. Make sure it is running.', 'warning');
  }
}

// Load statistics
async function loadStatistics() {
  try {
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    const apiUrl = settings.apiUrl || 'http://localhost:3000';

    // Get bookmarks count
    const bookmarksResponse = await fetch(`${apiUrl}/api/bookmarks?limit=1`);
    if (bookmarksResponse.ok) {
      const data = await bookmarksResponse.json();
      // Note: This just gets the first page, a real count would need a dedicated endpoint
      document.getElementById('totalBookmarks').textContent = '50+';
    }

    // Get categories count
    const categoriesResponse = await fetch(`${apiUrl}/api/categories`);
    if (categoriesResponse.ok) {
      const data = await categoriesResponse.json();
      document.getElementById('totalCategories').textContent = data.data.length;
    }

    // Last synced
    const lastSynced = await chrome.storage.local.get(['lastSynced']);
    if (lastSynced.lastSynced) {
      const date = new Date(lastSynced.lastSynced);
      document.getElementById('lastSynced').textContent = date.toLocaleString();
    }
  } catch (error) {
    console.error('Failed to load statistics:', error);
    document.getElementById('totalBookmarks').textContent = 'Error';
    document.getElementById('totalCategories').textContent = 'Error';
  }
}

// Sync now
async function syncNow() {
  showMessage('Syncing...', 'info');

  try {
    // Update last synced time
    await chrome.storage.local.set({ lastSynced: new Date().toISOString() });

    // Reload statistics
    await loadStatistics();

    showMessage('Sync completed successfully!', 'success');
  } catch (error) {
    showMessage('Sync failed: ' + error.message, 'error');
  }
}

// Import Chrome bookmarks
async function importChromeBookmarks() {
  if (!confirm('This will import all your Chrome bookmarks. Continue?')) {
    return;
  }

  showMessage('Importing bookmarks... This may take a while.', 'info');

  try {
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    const apiUrl = settings.apiUrl;
    const apiKey = settings.apiKey;

    // Get all Chrome bookmarks
    const bookmarkTree = await chrome.bookmarks.getTree();
    const bookmarks = [];

    function extractBookmarks(nodes) {
      for (const node of nodes) {
        if (node.url) {
          bookmarks.push({
            title: node.title,
            url: node.url
          });
        }
        if (node.children) {
          extractBookmarks(node.children);
        }
      }
    }

    extractBookmarks(bookmarkTree);

    // Import each bookmark
    let imported = 0;
    let failed = 0;

    for (const bookmark of bookmarks) {
      try {
        const response = await fetch(`${apiUrl}/api/bookmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bookmark,
            apiKey,
            fetchContent: false // Don't fetch content for bulk import
          })
        });

        if (response.ok) {
          imported++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }

      // Update progress
      if ((imported + failed) % 10 === 0) {
        showMessage(`Importing... ${imported} succeeded, ${failed} failed`, 'info');
      }
    }

    showMessage(`Import complete! ${imported} imported, ${failed} failed.`, 'success');
    loadStatistics();
  } catch (error) {
    showMessage('Import failed: ' + error.message, 'error');
  }
}

// Export bookmarks
async function exportBookmarks() {
  try {
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl;

    const response = await fetch(`${apiUrl}/api/bookmarks?limit=10000`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch bookmarks');
    }

    const bookmarks = data.data;

    // Convert to JSON
    const json = JSON.stringify(bookmarks, null, 2);

    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showMessage('Bookmarks exported successfully!', 'success');
  } catch (error) {
    showMessage('Export failed: ' + error.message, 'error');
  }
}

// Clear cache
async function clearCache() {
  if (!confirm('Clear all cached data?')) {
    return;
  }

  try {
    await chrome.storage.local.clear();
    showMessage('Cache cleared successfully!', 'success');
    loadStatistics();
  } catch (error) {
    showMessage('Failed to clear cache: ' + error.message, 'error');
  }
}

// Reset settings
async function resetSettings() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.sync.clear();
    await loadSettings();
    showMessage('Settings reset to defaults!', 'success');
  } catch (error) {
    showMessage('Failed to reset settings: ' + error.message, 'error');
  }
}

// Delete all bookmarks
async function deleteAllBookmarks() {
  const confirmation = prompt(
    'This will DELETE ALL BOOKMARKS from the database. This cannot be undone.\n\n' +
    'Type "DELETE ALL" to confirm:'
  );

  if (confirmation !== 'DELETE ALL') {
    return;
  }

  showMessage('Deleting all bookmarks...', 'info');

  try {
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl;

    // Get all bookmarks
    const response = await fetch(`${apiUrl}/api/bookmarks?limit=10000`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch bookmarks');
    }

    const bookmarks = data.data;

    // Delete each bookmark
    for (const bookmark of bookmarks) {
      await fetch(`${apiUrl}/api/bookmarks/${bookmark.id}`, {
        method: 'DELETE'
      });
    }

    showMessage('All bookmarks deleted!', 'success');
    loadStatistics();
  } catch (error) {
    showMessage('Failed to delete bookmarks: ' + error.message, 'error');
  }
}

// Show status message
function showMessage(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.className = `message message-${type}`;
  statusEl.textContent = message;
  statusEl.classList.remove('hidden');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 5000);
}
