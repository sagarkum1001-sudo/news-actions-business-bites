// User Preferences Manager
// Unified UI Implementation - Phase 4B

class PreferencesManager {
  constructor() {
    this.config = Environment.getConfig();
    this.authManager = authManager;
    this.storage = this.getStorage();
    this.currentPreferences = this.loadPreferences();
    this.modal = null;
  }

  async initialize() {
    console.log('⚙️ Preferences Manager initialized');
    this.applyCurrentPreferences();
  }

  getStorage() {
    // Use server storage for authenticated users, localStorage for others
    if (this.config.auth.requireAuthForAdvanced && this.authManager.isAuthenticated()) {
      return new ServerStorage();
    }
    return new LocalStorage();
  }

  loadPreferences() {
    const defaultPreferences = {
      theme: 'light',
      sidebarCollapsed: false,
      viewMode: 'grid', // 'grid' or 'list'
      itemsPerPage: 12,
      autoRefresh: false,
      refreshInterval: 300, // seconds
      notifications: {
        email: false,
        browser: false,
        marketAlerts: false,
        breakingNews: false
      },
      display: {
        showImpactScores: true,
        showSentiment: true,
        showImages: true,
        compactMode: false
      },
      search: {
        defaultMarket: 'US',
        defaultSort: 'relevance',
        saveRecentSearches: true
      }
    };

    try {
      const saved = this.storage.load('user_preferences');
      if (saved) {
        // Merge saved preferences with defaults
        return { ...defaultPreferences, ...saved };
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }

    return defaultPreferences;
  }

  savePreferences(preferences) {
    try {
      this.currentPreferences = { ...this.currentPreferences, ...preferences };
      this.storage.save('user_preferences', this.currentPreferences);
      this.applyCurrentPreferences();
      console.log('💾 Preferences saved:', preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  applyCurrentPreferences() {
    // Apply theme
    this.applyTheme(this.currentPreferences.theme);

    // Apply sidebar state
    this.applySidebarState(this.currentPreferences.sidebarCollapsed);

    // Apply view mode
    this.applyViewMode(this.currentPreferences.viewMode);

    // Apply display preferences
    this.applyDisplayPreferences(this.currentPreferences.display);

    console.log('🎨 Preferences applied:', this.currentPreferences);
  }

  applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--card-bg', '#2d2d2d');
      root.style.setProperty('--border-color', '#404040');
    } else {
      root.style.setProperty('--bg-color', '#f5f5f5');
      root.style.setProperty('--text-color', '#333333');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--border-color', '#e1e5e9');
    }

    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  }

  applySidebarState(collapsed) {
    const navPanel = document.getElementById('nav-panel');
    const mainContent = document.getElementById('main-content');

    if (collapsed) {
      navPanel?.classList.add('collapsed');
      mainContent?.classList.add('sidebar-collapsed');
    } else {
      navPanel?.classList.remove('collapsed');
      mainContent?.classList.remove('sidebar-collapsed');
    }
  }

  applyViewMode(mode) {
    // This will be applied when rendering news articles
    console.log('📱 View mode set to:', mode);
  }

  applyDisplayPreferences(display) {
    // Apply display preferences to existing elements
    const style = document.getElementById('dynamic-styles') || this.createDynamicStyles();

    let css = '';

    if (!display.showImpactScores) {
      css += '.impact-score { display: none !important; }';
    }

    if (!display.showSentiment) {
      css += '.sentiment-score { display: none !important; }';
    }

    if (!display.showImages) {
      css += '.news-image { display: none !important; }';
    }

    if (display.compactMode) {
      css += `
        .news-card { padding: 1rem !important; }
        .news-title { font-size: 1rem !important; }
        .news-summary { display: none !important; }
      `;
    }

    style.textContent = css;
  }

  createDynamicStyles() {
    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    document.head.appendChild(style);
    return style;
  }

  showPreferencesModal() {
    this.createPreferencesModal();
    this.populatePreferencesForm();
    this.attachPreferenceEventListeners();
  }

  createPreferencesModal() {
    const modalHtml = `
      <div id="preferences-modal" class="modal-overlay" style="
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
          max-width: 700px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <button onclick="preferencesManager.closeModal()" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">×</button>

          <h2 style="color: #667eea; margin-bottom: 1.5rem;">⚙️ Preferences</h2>

          <div class="preferences-tabs" style="
            display: flex;
            margin-bottom: 2rem;
            border-bottom: 1px solid #e1e5e9;
          ">
            <button onclick="preferencesManager.showTab('appearance')" class="pref-tab active" data-tab="appearance" style="
              padding: 0.75rem 1rem;
              border: none;
              background: none;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              font-weight: 500;
              color: #666;
            ">Appearance</button>
            <button onclick="preferencesManager.showTab('layout')" class="pref-tab" data-tab="layout" style="
              padding: 0.75rem 1rem;
              border: none;
              background: none;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              font-weight: 500;
              color: #666;
            ">Layout</button>
            <button onclick="preferencesManager.showTab('notifications')" class="pref-tab" data-tab="notifications" style="
              padding: 0.75rem 1rem;
              border: none;
              background: none;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              font-weight: 500;
              color: #666;
            ">Notifications</button>
            <button onclick="preferencesManager.showTab('search')" class="pref-tab" data-tab="search" style="
              padding: 0.75rem 1rem;
              border: none;
              background: none;
              cursor: pointer;
              border-bottom: 2px solid transparent;
              font-weight: 500;
              color: #666;
            ">Search</button>
          </div>

          <div class="preferences-content">
            <!-- Tab content will be populated here -->
          </div>

          <div class="preferences-actions" style="
            margin-top: 2rem;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
          ">
            <button onclick="preferencesManager.resetToDefaults()" style="
              padding: 0.5rem 1rem;
              border: 1px solid #ccc;
              background: white;
              color: #666;
              border-radius: 6px;
              cursor: pointer;
            ">Reset to Defaults</button>
            <button onclick="preferencesManager.saveAndClose()" style="
              padding: 0.5rem 1.5rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Save Preferences</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = document.getElementById('preferences-modal');
    this.showTab('appearance'); // Show default tab
  }

  showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.pref-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.style.borderBottomColor = 'transparent';
      tab.style.color = '#666';
    });

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
      activeTab.style.borderBottomColor = '#667eea';
      activeTab.style.color = '#667eea';
    }

    // Show tab content
    const content = document.querySelector('.preferences-content');
    if (content) {
      content.innerHTML = this.getTabContent(tabName);
      this.populateTabValues(tabName);
    }
  }

  getTabContent(tabName) {
    switch (tabName) {
      case 'appearance':
        return `
          <div class="pref-section">
            <h3 style="margin-bottom: 1rem; color: #333;">Theme</h3>
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="theme" value="light">
                <span>☀️ Light</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="theme" value="dark">
                <span>🌙 Dark</span>
              </label>
            </div>

            <h3 style="margin-bottom: 1rem; color: #333;">Display Options</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="showImpactScores">
                <span>Show Impact Scores</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="showSentiment">
                <span>Show Sentiment</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="showImages">
                <span>Show Images</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="compactMode">
                <span>Compact Mode</span>
              </label>
            </div>
          </div>
        `;

      case 'layout':
        return `
          <div class="pref-section">
            <h3 style="margin-bottom: 1rem; color: #333;">Sidebar</h3>
            <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem;">
              <input type="checkbox" id="sidebarCollapsed">
              <span>Keep sidebar collapsed</span>
            </label>

            <h3 style="margin-bottom: 1rem; color: #333;">View Mode</h3>
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="viewMode" value="grid">
                <span>📱 Grid View</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="viewMode" value="list">
                <span>📋 List View</span>
              </label>
            </div>

            <h3 style="margin-bottom: 1rem; color: #333;">Items Per Page</h3>
            <select id="itemsPerPage" style="
              padding: 0.5rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
            ">
              <option value="6">6 items</option>
              <option value="12">12 items</option>
              <option value="24">24 items</option>
              <option value="48">48 items</option>
            </select>
          </div>
        `;

      case 'notifications':
        return `
          <div class="pref-section">
            <h3 style="margin-bottom: 1rem; color: #333;">Notification Types</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="emailNotifications">
                <span>📧 Email notifications</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="browserNotifications">
                <span>🔔 Browser notifications</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="marketAlerts">
                <span>📈 Market alerts</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="breakingNews">
                <span>🚨 Breaking news</span>
              </label>
            </div>

            <h3 style="margin-bottom: 1rem; color: #333;">Auto Refresh</h3>
            <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <input type="checkbox" id="autoRefresh">
              <span>Enable auto-refresh</span>
            </label>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label for="refreshInterval">Refresh interval:</label>
              <select id="refreshInterval" style="
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
              ">
                <option value="60">1 minute</option>
                <option value="300">5 minutes</option>
                <option value="600">10 minutes</option>
                <option value="1800">30 minutes</option>
              </select>
            </div>
          </div>
        `;

      case 'search':
        return `
          <div class="pref-section">
            <h3 style="margin-bottom: 1rem; color: #333;">Default Search Settings</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
              <div>
                <label for="defaultMarket" style="display: block; margin-bottom: 0.5rem;">Default Market:</label>
                <select id="defaultMarket" style="
                  width: 100%;
                  padding: 0.5rem;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  background: white;
                ">
                  <option value="US">🇺🇸 US</option>
                  <option value="China">🇨🇳 China</option>
                  <option value="EU">🇪🇺 EU</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="Crypto">₿ Crypto</option>
                </select>
              </div>
              <div>
                <label for="defaultSort" style="display: block; margin-bottom: 0.5rem;">Default Sort:</label>
                <select id="defaultSort" style="
                  width: 100%;
                  padding: 0.5rem;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  background: white;
                ">
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="impact">Impact</option>
                </select>
              </div>
            </div>

            <label style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" id="saveRecentSearches">
              <span>Save recent searches</span>
            </label>
          </div>
        `;

      default:
        return '<p>Tab content not found.</p>';
    }
  }

  populateTabValues(tabName) {
    const prefs = this.currentPreferences;

    switch (tabName) {
      case 'appearance':
        // Theme
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
          input.checked = input.value === prefs.theme;
        });

        // Display options
        document.getElementById('showImpactScores').checked = prefs.display.showImpactScores;
        document.getElementById('showSentiment').checked = prefs.display.showSentiment;
        document.getElementById('showImages').checked = prefs.display.showImages;
        document.getElementById('compactMode').checked = prefs.display.compactMode;
        break;

      case 'layout':
        document.getElementById('sidebarCollapsed').checked = prefs.sidebarCollapsed;

        const viewModeInputs = document.querySelectorAll('input[name="viewMode"]');
        viewModeInputs.forEach(input => {
          input.checked = input.value === prefs.viewMode;
        });

        document.getElementById('itemsPerPage').value = prefs.itemsPerPage;
        break;

      case 'notifications':
        document.getElementById('emailNotifications').checked = prefs.notifications.email;
        document.getElementById('browserNotifications').checked = prefs.notifications.browser;
        document.getElementById('marketAlerts').checked = prefs.notifications.marketAlerts;
        document.getElementById('breakingNews').checked = prefs.notifications.breakingNews;
        document.getElementById('autoRefresh').checked = prefs.autoRefresh;
        document.getElementById('refreshInterval').value = prefs.refreshInterval;
        break;

      case 'search':
        document.getElementById('defaultMarket').value = prefs.search.defaultMarket;
        document.getElementById('defaultSort').value = prefs.search.defaultSort;
        document.getElementById('saveRecentSearches').checked = prefs.search.saveRecentSearches;
        break;
    }
  }

  attachPreferenceEventListeners() {
    // Live preview for some preferences
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    themeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.applyTheme(e.target.value);
        }
      });
    });

    const sidebarInput = document.getElementById('sidebarCollapsed');
    if (sidebarInput) {
      sidebarInput.addEventListener('change', (e) => {
        this.applySidebarState(e.target.checked);
      });
    }
  }

  saveAndClose() {
    const newPreferences = this.collectFormValues();
    this.savePreferences(newPreferences);
    this.closeModal();
    console.log('✅ Preferences saved and modal closed');
  }

  collectFormValues() {
    const prefs = { ...this.currentPreferences };

    // Appearance
    const themeInput = document.querySelector('input[name="theme"]:checked');
    if (themeInput) prefs.theme = themeInput.value;

    prefs.display = {
      showImpactScores: document.getElementById('showImpactScores')?.checked ?? true,
      showSentiment: document.getElementById('showSentiment')?.checked ?? true,
      showImages: document.getElementById('showImages')?.checked ?? true,
      compactMode: document.getElementById('compactMode')?.checked ?? false
    };

    // Layout
    prefs.sidebarCollapsed = document.getElementById('sidebarCollapsed')?.checked ?? false;

    const viewModeInput = document.querySelector('input[name="viewMode"]:checked');
    if (viewModeInput) prefs.viewMode = viewModeInput.value;

    const itemsPerPage = document.getElementById('itemsPerPage');
    if (itemsPerPage) prefs.itemsPerPage = parseInt(itemsPerPage.value);

    // Notifications
    prefs.notifications = {
      email: document.getElementById('emailNotifications')?.checked ?? false,
      browser: document.getElementById('browserNotifications')?.checked ?? false,
      marketAlerts: document.getElementById('marketAlerts')?.checked ?? false,
      breakingNews: document.getElementById('breakingNews')?.checked ?? false
    };

    prefs.autoRefresh = document.getElementById('autoRefresh')?.checked ?? false;
    const refreshInterval = document.getElementById('refreshInterval');
    if (refreshInterval) prefs.refreshInterval = parseInt(refreshInterval.value);

    // Search
    prefs.search = {
      defaultMarket: document.getElementById('defaultMarket')?.value ?? 'US',
      defaultSort: document.getElementById('defaultSort')?.value ?? 'relevance',
      saveRecentSearches: document.getElementById('saveRecentSearches')?.checked ?? true
    };

    return prefs;
  }

  resetToDefaults() {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      // Clear saved preferences
      this.storage.remove('user_preferences');

      // Reset to defaults
      this.currentPreferences = this.loadPreferences();
      this.applyCurrentPreferences();

      // Refresh modal
      this.showTab('appearance');

      console.log('🔄 Preferences reset to defaults');
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  // Utility methods
  getPreference(key) {
    return this.currentPreferences[key];
  }

  setPreference(key, value) {
    this.savePreferences({ [key]: value });
  }

  exportPreferences() {
    return JSON.stringify(this.currentPreferences, null, 2);
  }

  importPreferences(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.savePreferences(imported);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }
}

// Storage classes
class LocalStorage {
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('LocalStorage save failed:', error);
    }
  }

  load(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage load failed:', error);
      return null;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage remove failed:', error);
    }
  }
}

class ServerStorage {
  save(key, value) {
    // In a real implementation, this would save to server
    console.log('Server storage save (mock):', key, value);
    // For now, fall back to localStorage with server prefix
    localStorage.setItem(`server_${key}`, JSON.stringify(value));
  }

  load(key) {
    // In a real implementation, this would load from server
    console.log('Server storage load (mock):', key);
    try {
      const item = localStorage.getItem(`server_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  }

  remove(key) {
    console.log('Server storage remove (mock):', key);
    localStorage.removeItem(`server_${key}`);
  }
}

// Global instance
const preferencesManager = new PreferencesManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PreferencesManager, preferencesManager };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.PreferencesManager = PreferencesManager;
  window.preferencesManager = preferencesManager;
}
