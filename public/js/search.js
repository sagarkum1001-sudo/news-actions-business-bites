// Search Manager
// Unified UI Implementation - Phase 4A

class SearchManager {
  constructor() {
    this.config = Environment.getConfig();
    this.api = new APIManager();
    this.modal = null;
    this.currentQuery = '';
    this.searchResults = [];
    this.searchTimeout = null;
  }

  async initialize() {
    console.log('🔍 Search Manager initialized');
  }

  showSearchModal() {
    this.createSearchModal();
    this.attachEventListeners();
    this.focusSearchInput();
  }

  createSearchModal() {
    const modalHtml = `
      <div id="search-modal" class="modal-overlay" style="
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
          <button onclick="searchManager.closeModal()" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">×</button>

          <div class="search-header" style="
            margin-bottom: 1.5rem;
          ">
            <h2 style="color: #667eea; margin-bottom: 1rem;">🔍 Search Articles</h2>

            <div class="search-input-container" style="
              position: relative;
              margin-bottom: 1rem;
            ">
              <input type="text" id="search-input" placeholder="Search for articles, companies, or topics..."
                style="
                  width: 100%;
                  padding: 0.75rem 1rem;
                  padding-right: 3rem;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 1rem;
                  outline: none;
                  transition: border-color 0.3s ease;
                "
                onfocus="this.style.borderColor='#667eea'"
                onblur="this.style.borderColor='#e1e5e9'"
                oninput="searchManager.handleInput(this.value)"
              >
              <button onclick="searchManager.clearSearch()" style="
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: #666;
                display: none;
              " id="clear-search-btn">✕</button>
            </div>

            <div class="search-filters" style="
              display: flex;
              gap: 1rem;
              flex-wrap: wrap;
              margin-bottom: 1rem;
            ">
              <select id="search-market" style="
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
              ">
                <option value="">All Markets</option>
                <option value="US">🇺🇸 US</option>
                <option value="China">🇨🇳 China</option>
                <option value="EU">🇪🇺 EU</option>
                <option value="India">🇮🇳 India</option>
                <option value="Crypto">₿ Crypto</option>
              </select>

              <select id="search-sector" style="
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
              ">
                <option value="">All Sectors</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Energy">Energy</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>

              <select id="search-sort" style="
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
              ">
                <option value="relevance">Sort by Relevance</option>
                <option value="date">Sort by Date</option>
                <option value="impact">Sort by Impact</option>
              </select>
            </div>
          </div>

          <div id="search-results" style="
            min-height: 200px;
          ">
            <div class="search-placeholder" style="
              text-align: center;
              color: #666;
              padding: 2rem;
            ">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
              <p>Start typing to search for articles...</p>
              <p style="font-size: 0.9rem; margin-top: 0.5rem;">Search by company name, topic, or keywords</p>
            </div>
          </div>

          <div id="search-loading" style="display: none; text-align: center; padding: 2rem;">
            <div style="font-size: 1.5rem; margin-bottom: 1rem;">🔍</div>
            <p>Searching...</p>
          </div>

          <div id="search-error" style="display: none; text-align: center; padding: 2rem;">
            <div style="font-size: 1.5rem; margin-bottom: 1rem; color: #c33;">❌</div>
            <p id="error-message" style="color: #c33;"></p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = document.getElementById('search-modal');
  }

  attachEventListeners() {
    // Close modal when clicking overlay
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal) {
        this.closeModal();
      }
    });
  }

  focusSearchInput() {
    setTimeout(() => {
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
      }
    }, 100);
  }

  handleInput(query) {
    this.currentQuery = query.trim();

    // Show/hide clear button
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }

    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (query.length >= 2) {
      this.searchTimeout = setTimeout(() => {
        this.performSearch();
      }, 300);
    } else if (query.length === 0) {
      this.showPlaceholder();
    }
  }

  async performSearch() {
    if (!this.currentQuery) return;

    try {
      this.showLoading();

      const filters = this.getSearchFilters();
      const searchParams = new URLSearchParams({
        q: this.currentQuery,
        ...filters
      });

      console.log('🔍 Performing search:', searchParams.toString());

      // In a real implementation, this would call the search API
      // For now, simulate search results
      const results = await this.simulateSearch(this.currentQuery, filters);

      this.displayResults(results);

    } catch (error) {
      console.error('❌ Search error:', error);
      this.showError('Search failed. Please try again.');
    }
  }

  getSearchFilters() {
    const market = document.getElementById('search-market')?.value || '';
    const sector = document.getElementById('search-sector')?.value || '';
    const sort = document.getElementById('search-sort')?.value || 'relevance';

    return {
      market: market || undefined,
      sector: sector || undefined,
      sort: sort || undefined
    };
  }

  async simulateSearch(query, filters) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock search results based on query
    const mockResults = [
      {
        id: 1,
        title: `${query} Market Analysis`,
        summary: `Comprehensive analysis of ${query} market trends and developments.`,
        market: filters.market || 'US',
        sector: filters.sector || 'Technology',
        impact_score: 8.5,
        sentiment: 'positive',
        published_at: new Date().toISOString(),
        source: 'Business Bites AI'
      },
      {
        id: 2,
        title: `${query} Investment Opportunities`,
        summary: `Exploring investment opportunities in the ${query} sector.`,
        market: filters.market || 'US',
        sector: filters.sector || 'Finance',
        impact_score: 7.2,
        sentiment: 'neutral',
        published_at: new Date(Date.now() - 86400000).toISOString(),
        source: 'Market Intelligence'
      },
      {
        id: 3,
        title: `${query} Industry Report`,
        summary: `Latest industry report covering ${query} developments.`,
        market: filters.market || 'EU',
        sector: filters.sector || 'Manufacturing',
        impact_score: 6.8,
        sentiment: 'positive',
        published_at: new Date(Date.now() - 172800000).toISOString(),
        source: 'Industry Analysis'
      }
    ];

    // Filter results based on filters
    let filteredResults = mockResults;

    if (filters.market) {
      filteredResults = filteredResults.filter(r => r.market === filters.market);
    }

    if (filters.sector) {
      filteredResults = filteredResults.filter(r => r.sector === filters.sector);
    }

    // Sort results
    if (filters.sort === 'date') {
      filteredResults.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } else if (filters.sort === 'impact') {
      filteredResults.sort((a, b) => b.impact_score - a.impact_score);
    }

    return {
      query,
      total_results: filteredResults.length,
      results: filteredResults
    };
  }

  displayResults(searchData) {
    const resultsDiv = document.getElementById('search-results');

    if (!searchData.results || searchData.results.length === 0) {
      resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">📭</div>
          <p>No results found for "${searchData.query}"</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">Try different keywords or filters</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="margin-bottom: 1rem; color: #666;">
        Found ${searchData.total_results} result${searchData.total_results !== 1 ? 's' : ''} for "${searchData.query}"
      </div>
      <div class="search-results-list">
    `;

    searchData.results.forEach(result => {
      const impactColor = this.getImpactColor(result.impact_score);
      const sentimentColor = this.getSentimentColor(result.sentiment);
      const publishedDate = new Date(result.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      html += `
        <div class="search-result-item" style="
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        " onmouseover="this.style.borderColor='#667eea'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'"
           onmouseout="this.style.borderColor='#e1e5e9'; this.style.boxShadow='none'"
           onclick="searchManager.openResult(${result.id})">

          <h3 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.1rem;">${result.title}</h3>

          <p style="margin: 0 0 1rem 0; color: #666; line-height: 1.5;">${result.summary}</p>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; gap: 1rem; align-items: center;">
              <span style="font-size: 0.9rem; color: #666;">${result.market} • ${result.sector}</span>
              <span style="font-size: 0.9rem; color: #666;">${publishedDate}</span>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span style="background: ${impactColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
                Impact: ${result.impact_score}
              </span>
              <span style="background: ${sentimentColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
                ${result.sentiment}
              </span>
            </div>
          </div>

          <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #888;">
            Source: ${result.source}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    resultsDiv.innerHTML = html;
  }

  openResult(resultId) {
    console.log('📄 Opening search result:', resultId);
    // In a real implementation, this would navigate to the article
    // For now, just close the modal
    this.closeModal();
  }

  clearSearch() {
    const input = document.getElementById('search-input');
    if (input) {
      input.value = '';
      this.handleInput('');
    }
  }

  showLoading() {
    const resultsDiv = document.getElementById('search-results');
    const loadingDiv = document.getElementById('search-loading');
    const errorDiv = document.getElementById('search-error');

    if (resultsDiv) resultsDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'block';
  }

  showPlaceholder() {
    const resultsDiv = document.getElementById('search-results');
    const loadingDiv = document.getElementById('search-loading');
    const errorDiv = document.getElementById('search-error');

    if (loadingDiv) loadingDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
    if (resultsDiv) {
      resultsDiv.style.display = 'block';
      resultsDiv.innerHTML = `
        <div class="search-placeholder" style="
          text-align: center;
          color: #666;
          padding: 2rem;
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <p>Start typing to search for articles...</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">Search by company name, topic, or keywords</p>
        </div>
      `;
    }
  }

  showError(message) {
    const resultsDiv = document.getElementById('search-results');
    const loadingDiv = document.getElementById('search-loading');
    const errorDiv = document.getElementById('search-error');
    const errorMessage = document.getElementById('error-message');

    if (resultsDiv) resultsDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
  }

  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    // Clear search state
    this.currentQuery = '';
    this.searchResults = [];

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  getImpactColor(score) {
    if (score >= 8.5) return 'linear-gradient(135deg, #28a745, #20c997)';
    if (score >= 7.5) return 'linear-gradient(135deg, #17a2b8, #6f42c1)';
    if (score >= 6.5) return 'linear-gradient(135deg, #ffc107, #fd7e14)';
    if (score >= 5.5) return 'linear-gradient(135deg, #dc3545, #c82333)';
    return 'linear-gradient(135deg, #6c757d, #495057)';
  }

  getSentimentColor(sentiment) {
    if (!sentiment) return 'linear-gradient(135deg, #6c757d, #495057)';
    sentiment = sentiment.toLowerCase();
    if (sentiment === 'positive') return 'linear-gradient(135deg, #28a745, #20c997)';
    if (sentiment === 'negative') return 'linear-gradient(135deg, #dc3545, #c82333)';
    return 'linear-gradient(135deg, #ffc107, #fd7e14)';
  }
}

// Global instance
const searchManager = new SearchManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SearchManager, searchManager };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.SearchManager = SearchManager;
  window.searchManager = searchManager;
}
