// Watchlist Manager
// Unified UI Implementation - Phase 4C

class WatchlistManager {
  constructor() {
    this.config = Environment.getConfig();
    this.authManager = authManager;
    this.storage = this.getStorage();
    this.watchlist = this.loadWatchlist();
    this.modal = null;
  }

  async initialize() {
    console.log('⭐ Watchlist Manager initialized');
    this.updateSidebarCounter();
  }

  getStorage() {
    // Use server storage for authenticated users, localStorage for others
    if (this.config.auth.requireAuthForAdvanced && this.authManager.isAuthenticated()) {
      return new ServerStorage();
    }
    return new LocalStorage();
  }

  loadWatchlist() {
    try {
      const saved = this.storage.load('user_watchlist');
      return saved || [];
    } catch (error) {
      console.warn('Failed to load watchlist:', error);
      return [];
    }
  }

  saveWatchlist() {
    try {
      this.storage.save('user_watchlist', this.watchlist);
      this.updateSidebarCounter();
      console.log('💾 Watchlist saved:', this.watchlist.length, 'companies');
    } catch (error) {
      console.error('Failed to save watchlist:', error);
    }
  }

  addToWatchlist(company) {
    if (!company || !company.symbol) {
      console.error('Invalid company data:', company);
      return false;
    }

    // Check if already in watchlist
    const exists = this.watchlist.find(item => item.symbol === company.symbol);
    if (exists) {
      console.log('Company already in watchlist:', company.symbol);
      return false;
    }

    // Add to watchlist with timestamp
    const watchlistItem = {
      ...company,
      addedAt: new Date().toISOString(),
      alerts: {
        price: false,
        news: true,
        volume: false
      }
    };

    this.watchlist.push(watchlistItem);
    this.saveWatchlist();

    console.log('✅ Added to watchlist:', company.symbol);
    return true;
  }

  removeFromWatchlist(symbol) {
    const index = this.watchlist.findIndex(item => item.symbol === symbol);
    if (index > -1) {
      this.watchlist.splice(index, 1);
      this.saveWatchlist();
      console.log('❌ Removed from watchlist:', symbol);
      return true;
    }
    return false;
  }

  isInWatchlist(symbol) {
    return this.watchlist.some(item => item.symbol === symbol);
  }

  getWatchlistItem(symbol) {
    return this.watchlist.find(item => item.symbol === symbol);
  }

  updateAlerts(symbol, alerts) {
    const item = this.getWatchlistItem(symbol);
    if (item) {
      item.alerts = { ...item.alerts, ...alerts };
      this.saveWatchlist();
      console.log('🔔 Updated alerts for:', symbol, alerts);
      return true;
    }
    return false;
  }

  updateSidebarCounter() {
    // Update sidebar counter (will be implemented when sidebar is updated)
    const count = this.watchlist.length;
    console.log('📊 Watchlist count:', count);
  }

  showWatchlistModal() {
    this.createWatchlistModal();
    this.renderWatchlist();
    this.attachWatchlistEventListeners();
  }

  createWatchlistModal() {
    const modalHtml = `
      <div id="watchlist-modal" class="modal-overlay" style="
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
          max-width: 800px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <button onclick="watchlistManager.closeModal()" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">×</button>

          <div class="watchlist-header" style="
            margin-bottom: 2rem;
          ">
            <h2 style="color: #667eea; margin-bottom: 0.5rem;">⭐ My Watchlist</h2>
            <p style="color: #666;">Track companies and get personalized alerts</p>
          </div>

          <div id="watchlist-content">
            <!-- Watchlist items will be populated here -->
          </div>

          <div id="watchlist-empty" style="display: none; text-align: center; padding: 3rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📈</div>
            <h3 style="color: #333; margin-bottom: 1rem;">Your watchlist is empty</h3>
            <p style="color: #666; margin-bottom: 2rem;">Add companies to track their performance and get alerts</p>
            <button onclick="watchlistManager.showAddCompanyModal()" style="
              padding: 0.75rem 1.5rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">Add First Company</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = document.getElementById('watchlist-modal');
  }

  renderWatchlist() {
    const content = document.getElementById('watchlist-content');
    const empty = document.getElementById('watchlist-empty');

    if (!content) return;

    if (this.watchlist.length === 0) {
      content.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    content.style.display = 'block';

    let html = `
      <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #666;">${this.watchlist.length} companies tracked</span>
        <button onclick="watchlistManager.showAddCompanyModal()" style="
          padding: 0.5rem 1rem;
          background: #f8f9fa;
          color: #667eea;
          border: 1px solid #667eea;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        ">+ Add Company</button>
      </div>

      <div class="watchlist-grid">
    `;

    this.watchlist.forEach(company => {
      const addedDate = new Date(company.addedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      html += `
        <div class="watchlist-item" style="
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h4 style="margin: 0 0 0.25rem 0; color: #333;">${company.name || company.symbol}</h4>
              <span style="background: #f0f2ff; color: #667eea; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500;">
                ${company.symbol}
              </span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button onclick="watchlistManager.showCompanyAlerts('${company.symbol}')" style="
                padding: 0.25rem 0.5rem;
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
              ">🔔</button>
              <button onclick="watchlistManager.removeFromWatchlist('${company.symbol}'); watchlistManager.renderWatchlist()" style="
                padding: 0.25rem 0.5rem;
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
              ">×</button>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 0.9rem; color: #666;">
              Added ${addedDate}
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span style="font-size: 0.9rem; color: #666;">Alerts:</span>
              ${company.alerts.price ? '<span title="Price alerts">💰</span>' : ''}
              ${company.alerts.news ? '<span title="News alerts">📰</span>' : ''}
              ${company.alerts.volume ? '<span title="Volume alerts">📊</span>' : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    content.innerHTML = html;
  }

  showAddCompanyModal() {
    const modalHtml = `
      <div id="add-company-modal" class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        backdrop-filter: blur(5px);
      ">
        <div class="modal-content" style="
          background: white;
          border-radius: 15px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <button onclick="watchlistManager.closeAddCompanyModal()" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">×</button>

          <h3 style="color: #667eea; margin-bottom: 1rem;">Add Company to Watchlist</h3>

          <div style="margin-bottom: 1.5rem;">
            <label for="company-symbol" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Company Symbol:</label>
            <input type="text" id="company-symbol" placeholder="e.g., AAPL, TSLA, GOOGL"
              style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                font-size: 1rem;
                outline: none;
                transition: border-color 0.3s ease;
              "
              onfocus="this.style.borderColor='#667eea'"
              onblur="this.style.borderColor='#e1e5e9'"
              oninput="this.value = this.value.toUpperCase()"
            >
          </div>

          <div style="margin-bottom: 2rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Alert Preferences:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="alert-price" checked>
                <span>Price changes</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="alert-news" checked>
                <span>News alerts</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="alert-volume">
                <span>Volume spikes</span>
              </label>
            </div>
          </div>

          <div style="display: flex; gap: 1rem;">
            <button onclick="watchlistManager.addCompanyFromModal()" style="
              flex: 1;
              padding: 0.75rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">Add to Watchlist</button>
            <button onclick="watchlistManager.closeAddCompanyModal()" style="
              padding: 0.75rem 1.5rem;
              background: #f8f9fa;
              color: #666;
              border: 1px solid #ddd;
              border-radius: 8px;
              cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('company-symbol').focus();
  }

  async addCompanyFromModal() {
    const symbol = document.getElementById('company-symbol').value.trim().toUpperCase();
    const priceAlerts = document.getElementById('alert-price').checked;
    const newsAlerts = document.getElementById('alert-news').checked;
    const volumeAlerts = document.getElementById('alert-volume').checked;

    if (!symbol) {
      alert('Please enter a company symbol');
      return;
    }

    // Simulate company lookup (in real implementation, this would call an API)
    const company = await this.lookupCompany(symbol);
    if (!company) {
      alert(`Company symbol "${symbol}" not found. Please check the symbol and try again.`);
      return;
    }

    // Add to watchlist
    const success = this.addToWatchlist({
      ...company,
      alerts: {
        price: priceAlerts,
        news: newsAlerts,
        volume: volumeAlerts
      }
    });

    if (success) {
      this.closeAddCompanyModal();
      this.renderWatchlist();
      alert(`${company.name} (${company.symbol}) has been added to your watchlist!`);
    } else {
      alert('This company is already in your watchlist.');
    }
  }

  async lookupCompany(symbol) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock company data
    const mockCompanies = {
      'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', market: 'NASDAQ' },
      'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', market: 'NASDAQ' },
      'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', market: 'NASDAQ' },
      'MSFT': { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', market: 'NASDAQ' },
      'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Retail', market: 'NASDAQ' },
      'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', market: 'NASDAQ' },
      'META': { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', market: 'NASDAQ' },
      'NFLX': { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', market: 'NASDAQ' }
    };

    return mockCompanies[symbol] || null;
  }

  showCompanyAlerts(symbol) {
    const company = this.getWatchlistItem(symbol);
    if (!company) return;

    const modalHtml = `
      <div id="company-alerts-modal" class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        backdrop-filter: blur(5px);
      ">
        <div class="modal-content" style="
          background: white;
          border-radius: 15px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <button onclick="watchlistManager.closeCompanyAlertsModal()" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">×</button>

          <h3 style="color: #667eea; margin-bottom: 1rem;">Alert Settings - ${company.name}</h3>

          <div style="margin-bottom: 2rem;">
            <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="alert-price-edit" ${company.alerts.price ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 500;">Price Alerts</div>
                  <div style="font-size: 0.9rem; color: #666;">Get notified of significant price changes</div>
                </div>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="alert-news-edit" ${company.alerts.news ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 500;">News Alerts</div>
                  <div style="font-size: 0.9rem; color: #666;">Get notified of company news and updates</div>
                </div>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="alert-volume-edit" ${company.alerts.volume ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 500;">Volume Alerts</div>
                  <div style="font-size: 0.9rem; color: #666;">Get notified of unusual trading volume</div>
                </div>
              </label>
            </div>
          </div>

          <div style="display: flex; gap: 1rem;">
            <button onclick="watchlistManager.saveCompanyAlerts('${symbol}')" style="
              flex: 1;
              padding: 0.75rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">Save Settings</button>
            <button onclick="watchlistManager.closeCompanyAlertsModal()" style="
              padding: 0.75rem 1.5rem;
              background: #f8f9fa;
              color: #666;
              border: 1px solid #ddd;
              border-radius: 8px;
              cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  saveCompanyAlerts(symbol) {
    const price = document.getElementById('alert-price-edit').checked;
    const news = document.getElementById('alert-news-edit').checked;
    const volume = document.getElementById('alert-volume-edit').checked;

    this.updateAlerts(symbol, { price, news, volume });
    this.closeCompanyAlertsModal();
    this.renderWatchlist();
  }

  attachWatchlistEventListeners() {
    // Add any additional event listeners here
  }

  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  closeAddCompanyModal() {
    const modal = document.getElementById('add-company-modal');
    if (modal) modal.remove();
  }

  closeCompanyAlertsModal() {
    const modal = document.getElementById('company-alerts-modal');
    if (modal) modal.remove();
  }

  // Utility methods
  getWatchlistCount() {
    return this.watchlist.length;
  }

  exportWatchlist() {
    return JSON.stringify(this.watchlist, null, 2);
  }

  importWatchlist(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.watchlist = imported;
        this.saveWatchlist();
        return true;
      }
    } catch (error) {
      console.error('Failed to import watchlist:', error);
    }
    return false;
  }
}

// Global instance
const watchlistManager = new WatchlistManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WatchlistManager, watchlistManager };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.WatchlistManager = WatchlistManager;
  window.watchlistManager = watchlistManager;
}
