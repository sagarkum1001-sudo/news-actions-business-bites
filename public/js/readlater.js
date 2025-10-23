// Read Later Manager
// Unified UI Implementation - Phase 4C

class ReadLaterManager {
  constructor() {
    this.config = Environment.getConfig();
    this.authManager = authManager;
    this.storage = this.getStorage();
    this.readLaterList = this.loadReadLaterList();
    this.modal = null;
  }

  async initialize() {
    console.log('📖 Read Later Manager initialized');
    this.updateSidebarCounter();
  }

  getStorage() {
    // Use server storage for authenticated users, localStorage for others
    if (this.config.auth.requireAuthForAdvanced && this.authManager.isAuthenticated()) {
      return new ServerStorage();
    }
    return new LocalStorage();
  }

  loadReadLaterList() {
    try {
      const saved = this.storage.load('user_read_later');
      return saved || [];
    } catch (error) {
      console.warn('Failed to load read later list:', error);
      return [];
    }
  }

  saveReadLaterList() {
    try {
      this.storage.save('user_read_later', this.readLaterList);
      this.updateSidebarCounter();
      console.log('💾 Read later list saved:', this.readLaterList.length, 'articles');
    } catch (error) {
      console.error('Failed to save read later list:', error);
    }
  }

  addToReadLater(article) {
    if (!article || !article.id) {
      console.error('Invalid article data:', article);
      return false;
    }

    // Check if already in read later list
    const exists = this.readLaterList.find(item => item.id === article.id);
    if (exists) {
      console.log('Article already in read later list:', article.id);
      return false;
    }

    // Add to read later list with timestamp
    const readLaterItem = {
      ...article,
      addedAt: new Date().toISOString(),
      read: false,
      tags: []
    };

    this.readLaterList.push(readLaterItem);
    this.saveReadLaterList();

    console.log('✅ Added to read later:', article.title);
    return true;
  }

  removeFromReadLater(articleId) {
    const index = this.readLaterList.findIndex(item => item.id === articleId);
    if (index > -1) {
      this.readLaterList.splice(index, 1);
      this.saveReadLaterList();
      console.log('❌ Removed from read later:', articleId);
      return true;
    }
    return false;
  }

  markAsRead(articleId) {
    const item = this.readLaterList.find(item => item.id === articleId);
    if (item) {
      item.read = true;
      item.readAt = new Date().toISOString();
      this.saveReadLaterList();
      console.log('📖 Marked as read:', articleId);
      return true;
    }
    return false;
  }

  markAsUnread(articleId) {
    const item = this.readLaterList.find(item => item.id === articleId);
    if (item) {
      item.read = false;
      delete item.readAt;
      this.saveReadLaterList();
      console.log('📖 Marked as unread:', articleId);
      return true;
    }
    return false;
  }

  isInReadLater(articleId) {
    return this.readLaterList.some(item => item.id === articleId);
  }

  getReadLaterItem(articleId) {
    return this.readLaterList.find(item => item.id === articleId);
  }

  updateTags(articleId, tags) {
    const item = this.getReadLaterItem(articleId);
    if (item) {
      item.tags = tags;
      this.saveReadLaterList();
      console.log('🏷️ Updated tags for:', articleId, tags);
      return true;
    }
    return false;
  }

  updateSidebarCounter() {
    // Update sidebar counter (will be implemented when sidebar is updated)
    const count = this.readLaterList.length;
    console.log('📊 Read later count:', count);
  }

  showReadLaterModal() {
    this.createReadLaterModal();
    this.renderReadLaterList();
    this.attachReadLaterEventListeners();
  }

  createReadLaterModal() {
    const modalHtml = `
      <div id="read-later-modal" class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      ">
        <div class="modal-content" style="
          background: white;
          border-radius: 15px;
          padding: 2rem;
          max-width: 900px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <button onclick="readLaterManager.closeModal()" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">×</button>

          <div class="read-later-header" style="
            margin-bottom: 2rem;
          ">
            <h2 style="color: #667eea; margin-bottom: 0.5rem;">📖 Read Later</h2>
            <p style="color: #666;">Articles saved for later reading</p>
          </div>

          <div class="read-later-filters" style="
            margin-bottom: 1.5rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          ">
            <select id="read-later-filter" style="
              padding: 0.5rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
            ">
              <option value="all">All Articles</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <select id="read-later-sort" style="
              padding: 0.5rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
            ">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">By Title</option>
            </select>
          </div>

          <div id="read-later-content">
            <!-- Read later items will be populated here -->
          </div>

          <div id="read-later-empty" style="display: none; text-align: center; padding: 3rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📚</div>
            <h3 style="color: #333; margin-bottom: 1rem;">No saved articles yet</h3>
            <p style="color: #666; margin-bottom: 2rem;">Save articles you want to read later by clicking the bookmark icon</p>
            <button onclick="readLaterManager.closeModal()" style="
              padding: 0.75rem 1.5rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">Browse Articles</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = document.getElementById('read-later-modal');

    // Add filter event listeners
    document.getElementById('read-later-filter').addEventListener('change', () => this.renderReadLaterList());
    document.getElementById('read-later-sort').addEventListener('change', () => this.renderReadLaterList());
  }

  renderReadLaterList() {
    const content = document.getElementById('read-later-content');
    const empty = document.getElementById('read-later-empty');

    if (!content) return;

    // Get filter and sort options
    const filter = document.getElementById('read-later-filter')?.value || 'all';
    const sort = document.getElementById('read-later-sort')?.value || 'newest';

    // Filter items
    let filteredItems = [...this.readLaterList];

    if (filter === 'unread') {
      filteredItems = filteredItems.filter(item => !item.read);
    } else if (filter === 'read') {
      filteredItems = filteredItems.filter(item => item.read);
    }

    // Sort items
    filteredItems.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.addedAt) - new Date(b.addedAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'newest':
        default:
          return new Date(b.addedAt) - new Date(a.addedAt);
      }
    });

    if (filteredItems.length === 0) {
      content.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    content.style.display = 'block';

    let html = `
      <div style="margin-bottom: 1rem; color: #666;">
        ${filteredItems.length} article${filteredItems.length !== 1 ? 's' : ''} ${filter !== 'all' ? `(${filter})` : ''}
      </div>

      <div class="read-later-grid">
    `;

    filteredItems.forEach(article => {
      const addedDate = new Date(article.addedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const readStatus = article.read ? 'read' : 'unread';
      const readIcon = article.read ? '📖' : '📕';
      const readText = article.read ? 'Mark as unread' : 'Mark as read';

      html += `
        <div class="read-later-item ${readStatus}" style="
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          ${article.read ? 'opacity: 0.7;' : ''}
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1rem; line-height: 1.4;">${article.title || 'Untitled Article'}</h4>

              <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem; color: #666;">${article.source || 'Unknown Source'}</span>
                <span style="font-size: 0.9rem; color: #666;">•</span>
                <span style="font-size: 0.9rem; color: #666;">${addedDate}</span>
                ${article.read ? `<span style="font-size: 0.9rem; color: #28a745;">✓ Read</span>` : `<span style="font-size: 0.9rem; color: #ffc107;">● Unread</span>`}
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
              <button onclick="readLaterManager.${article.read ? 'markAsUnread' : 'markAsRead'}('${article.id}'); readLaterManager.renderReadLaterList()" style="
                padding: 0.25rem 0.5rem;
                background: ${article.read ? '#d4edda' : '#fff3cd'};
                color: ${article.read ? '#155724' : '#856404'};
                border: 1px solid ${article.read ? '#c3e6cb' : '#ffeaa7'};
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
              " title="${readText}">${readIcon}</button>

              <button onclick="readLaterManager.openArticle('${article.link}')" style="
                padding: 0.25rem 0.5rem;
                background: #e7f3ff;
                color: #0066cc;
                border: 1px solid #b3d9ff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
              " title="Read article">👁️</button>

              <button onclick="readLaterManager.removeFromReadLater('${article.id}'); readLaterManager.renderReadLaterList()" style="
                padding: 0.25rem 0.5rem;
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
              " title="Remove from read later">×</button>
            </div>
          </div>

          ${article.summary ? `
            <div style="color: #666; font-size: 0.9rem; line-height: 1.4;">
              ${article.summary.length > 150 ? article.summary.substring(0, 150) + '...' : article.summary}
            </div>
          ` : ''}

          ${article.tags && article.tags.length > 0 ? `
            <div style="margin-top: 0.5rem;">
              ${article.tags.map(tag => `<span style="background: #f0f2ff; color: #667eea; padding: 0.2rem 0.4rem; border-radius: 10px; font-size: 0.75rem; margin-right: 0.25rem;">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });

    html += `</div>`;
    content.innerHTML = html;
  }

  openArticle(url) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  attachReadLaterEventListeners() {
    // Add any additional event listeners here
  }

  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  // Utility methods
  getReadLaterCount() {
    return this.readLaterList.length;
  }

  getUnreadCount() {
    return this.readLaterList.filter(item => !item.read).length;
  }

  exportReadLaterList() {
    return JSON.stringify(this.readLaterList, null, 2);
  }

  importReadLaterList(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.readLaterList = imported;
        this.saveReadLaterList();
        return true;
      }
    } catch (error) {
      console.error('Failed to import read later list:', error);
    }
    return false;
  }

  // Bulk operations
  markAllAsRead() {
    this.readLaterList.forEach(item => {
      if (!item.read) {
        item.read = true;
        item.readAt = new Date().toISOString();
      }
    });
    this.saveReadLaterList();
    console.log('📖 Marked all as read');
  }

  removeReadArticles() {
    this.readLaterList = this.readLaterList.filter(item => !item.read);
    this.saveReadLaterList();
    console.log('🗑️ Removed all read articles');
  }

  clearAll() {
    if (confirm('Are you sure you want to clear all saved articles? This action cannot be undone.')) {
      this.readLaterList = [];
      this.saveReadLaterList();
      console.log('🗑️ Cleared all saved articles');
    }
  }
}

// Global instance
const readLaterManager = new ReadLaterManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReadLaterManager, readLaterManager };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.ReadLaterManager = ReadLaterManager;
  window.readLaterManager = readLaterManager;
}
