// AI Bookmark Organizer - Popup Script

let currentTab = 'bookmarks';
let config = {};
let currentBookmark = null;
let chatHistory = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  setupEventListeners();
  loadBookmarks();
  loadCategories();
});

// Load configuration
async function loadConfig() {
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  if (response.success) {
    config = response.config;

    // Check if configured
    if (!config.apiKey) {
      showError('Please configure your OpenRouter API key in settings');
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Search
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // AI search toggle
  document.getElementById('aiSearchToggle').addEventListener('change', (e) => {
    const input = document.getElementById('searchInput');
    if (e.target.checked) {
      input.placeholder = 'AI semantic search...';
    } else {
      input.placeholder = 'Search bookmarks...';
    }
  });

  // Save current page
  document.getElementById('saveCurrentBtn').addEventListener('click', saveCurrentPage);

  // Chat
  document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Add category
  document.getElementById('addCategoryBtn').addEventListener('click', showAddCategoryForm);

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });

  // Save bookmark form
  document.getElementById('saveBookmarkForm').addEventListener('submit', handleSaveBookmark);
}

// Switch tabs
function switchTab(tabName) {
  currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}Tab`);
  });

  // Load data for tab
  if (tabName === 'bookmarks') {
    loadBookmarks();
  } else if (tabName === 'categories') {
    loadCategories();
  }
}

// API request helper
async function apiRequest(endpoint, method = 'GET', data = null) {
  const response = await chrome.runtime.sendMessage({
    action: 'apiRequest',
    endpoint,
    method,
    data
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
}

// Load bookmarks
async function loadBookmarks() {
  showLoading(true);
  hideError();

  try {
    const result = await apiRequest('/api/bookmarks?limit=50');
    const bookmarks = result.data;

    const container = document.getElementById('bookmarksList');
    const noBookmarks = document.getElementById('noBookmarks');

    if (bookmarks.length === 0) {
      container.innerHTML = '';
      noBookmarks.classList.remove('hidden');
    } else {
      noBookmarks.classList.add('hidden');
      container.innerHTML = bookmarks.map(bookmark => createBookmarkElement(bookmark)).join('');

      // Add click listeners
      container.querySelectorAll('.bookmark-item').forEach((el, idx) => {
        el.addEventListener('click', (e) => {
          if (!e.target.classList.contains('bookmark-action-btn')) {
            openBookmark(bookmarks[idx]);
          }
        });
      });

      // Delete buttons
      container.querySelectorAll('.delete-bookmark').forEach((btn, idx) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteBookmark(bookmarks[idx].id);
        });
      });
    }
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Create bookmark HTML element
function createBookmarkElement(bookmark) {
  const category = bookmark.category_name || 'Uncategorized';
  const tags = bookmark.tags || [];

  return `
    <div class="bookmark-item" data-id="${bookmark.id}">
      <div class="bookmark-header">
        <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
        <div class="bookmark-actions">
          <button class="bookmark-action-btn delete-bookmark" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      <div class="bookmark-meta">
        <span class="bookmark-category">${escapeHtml(category)}</span>
        ${tags.map(tag => `<span class="bookmark-tag">#${escapeHtml(tag)}</span>`).join('')}
      </div>
    </div>
  `;
}

// Open bookmark in new tab
function openBookmark(bookmark) {
  chrome.tabs.create({ url: bookmark.url });

  // Update visit count
  apiRequest(`/api/bookmarks/${bookmark.id}`, 'PUT', {
    visit_count: (bookmark.visit_count || 0) + 1,
    last_visited_at: new Date().toISOString()
  }).catch(console.error);
}

// Delete bookmark
async function deleteBookmark(bookmarkId) {
  if (!confirm('Are you sure you want to delete this bookmark?')) {
    return;
  }

  try {
    await apiRequest(`/api/bookmarks/${bookmarkId}`, 'DELETE');
    loadBookmarks();
  } catch (error) {
    showError(error.message);
  }
}

// Load categories
async function loadCategories() {
  try {
    const result = await apiRequest('/api/categories');
    const categories = result.data;

    const container = document.getElementById('categoriesList');
    container.innerHTML = categories.map(category => createCategoryElement(category)).join('');

    // Add click listeners
    container.querySelectorAll('.category-item').forEach((el, idx) => {
      el.addEventListener('click', () => {
        showCategoryDetails(categories[idx]);
      });
    });
  } catch (error) {
    showError(error.message);
  }
}

// Create category HTML element
function createCategoryElement(category) {
  const icon = category.icon || '📁';
  const count = category.bookmark_count || 0;

  return `
    <div class="category-item" data-id="${category.id}">
      <div class="category-info">
        <div class="category-icon">${icon}</div>
        <div class="category-details">
          <div class="category-name">${escapeHtml(category.name)}</div>
          <div class="category-count">${count} bookmark${count !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  `;
}

// Show category details
function showCategoryDetails(category) {
  // This could open a modal or navigate to a filtered view
  document.getElementById('searchInput').value = `category:${category.name}`;
  switchTab('bookmarks');
  handleSearch();
}

// Handle search
async function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) {
    loadBookmarks();
    return;
  }

  const useAI = document.getElementById('aiSearchToggle').checked || query.startsWith('/');
  const searchQuery = query.startsWith('/') ? query.substring(1) : query;

  showLoading(true);
  hideError();

  try {
    let bookmarks;

    if (useAI) {
      const result = await apiRequest('/api/bookmarks/search/semantic', 'POST', {
        query: searchQuery
      });
      bookmarks = result.data;
    } else {
      const result = await apiRequest(`/api/bookmarks/search?q=${encodeURIComponent(searchQuery)}`);
      bookmarks = result.data;
    }

    const container = document.getElementById('bookmarksList');
    if (bookmarks.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No results found</p></div>';
    } else {
      container.innerHTML = bookmarks.map(bookmark => createBookmarkElement(bookmark)).join('');

      // Add click listeners
      container.querySelectorAll('.bookmark-item').forEach((el, idx) => {
        el.addEventListener('click', () => openBookmark(bookmarks[idx]));
      });

      // Delete buttons
      container.querySelectorAll('.delete-bookmark').forEach((btn, idx) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteBookmark(bookmarks[idx].id);
        });
      });
    }
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Save current page
async function saveCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    currentBookmark = {
      url: tab.url,
      title: tab.title,
      description: ''
    };

    // Load categories for dropdown
    const result = await apiRequest('/api/categories');
    const categories = result.data;

    const select = document.getElementById('bookmarkCategory');
    select.innerHTML = categories.map(cat =>
      `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
    ).join('');

    // Fill form
    document.getElementById('bookmarkTitle').value = tab.title;
    document.getElementById('bookmarkUrl').value = tab.url;

    // Get AI suggestion
    showLoading(true);
    try {
      const analysis = await apiRequest('/api/ai/suggest', 'POST', {
        bookmark: currentBookmark
      });

      document.getElementById('aiSuggestion').textContent =
        `Category: ${analysis.data.category} - ${analysis.data.explanation}`;
      document.getElementById('suggestedTags').innerHTML =
        analysis.data.tags.map(tag => `<span class="badge">${escapeHtml(tag)}</span>`).join('');
      document.getElementById('aiAnalysis').classList.remove('hidden');

      // Pre-select suggested category
      const suggestedCategory = categories.find(c =>
        c.name.toLowerCase() === analysis.data.category.toLowerCase()
      );
      if (suggestedCategory) {
        select.value = suggestedCategory.id;
      }
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      showLoading(false);
    }

    // Show modal
    document.getElementById('saveBookmarkModal').classList.remove('hidden');
  } catch (error) {
    showError(error.message);
  }
}

// Handle save bookmark form submission
async function handleSaveBookmark(e) {
  e.preventDefault();

  const title = document.getElementById('bookmarkTitle').value;
  const url = document.getElementById('bookmarkUrl').value;
  const categoryId = document.getElementById('bookmarkCategory').value;
  const notes = document.getElementById('bookmarkNotes').value;

  showLoading(true);

  try {
    await apiRequest('/api/bookmarks', 'POST', {
      url,
      title,
      description: notes,
      category_id: categoryId ? parseInt(categoryId) : null,
      fetchContent: false // Already have the data
    });

    document.getElementById('saveBookmarkModal').classList.add('hidden');
    switchTab('bookmarks');
    loadBookmarks();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  // Add user message to UI
  addChatMessage(message, 'user');
  chatHistory.push({ role: 'user', content: message });
  input.value = '';

  try {
    const response = await apiRequest('/api/ai/chat', 'POST', {
      conversationHistory: chatHistory,
      bookmark: currentBookmark || { title: 'General', url: '' }
    });

    const aiMessage = response.data.message;
    addChatMessage(aiMessage, 'assistant');
    chatHistory.push({ role: 'assistant', content: aiMessage });
  } catch (error) {
    addChatMessage(`Error: ${error.message}`, 'assistant');
  }
}

// Add chat message to UI
function addChatMessage(content, role) {
  const messagesContainer = document.getElementById('chatMessages');
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${role}`;
  messageEl.textContent = content;
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show add category form
function showAddCategoryForm() {
  const name = prompt('Enter category name:');
  if (!name) return;

  apiRequest('/api/categories', 'POST', { name })
    .then(() => loadCategories())
    .catch(error => showError(error.message));
}

// Show/hide loading state
function showLoading(show) {
  document.getElementById('loadingState').classList.toggle('hidden', !show);
}

// Show error
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorState').classList.remove('hidden');
}

// Hide error
function hideError() {
  document.getElementById('errorState').classList.add('hidden');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
