class NewsActionsApp {
  constructor() {
    this.currentMarket = 'US';
    this.currentSector = 'Technology';
    this.chart = null;
    this.init();
  }

  async init() {
    try {
      await this.loadSectors();
      await this.loadMarketData();
      this.setupEventListeners();
      this.startAutoRefresh();
      console.log('News and Actions app initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
      this.showError('Failed to initialize application');
    }
  }

  async loadSectors() {
    try {
      const response = await fetch('/api/sectors');
      const sectors = await response.json();
      
      const sectorSelect = document.getElementById('sector-select');
      sectorSelect.innerHTML = '';
      
      sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        option.selected = sector === this.currentSector;
        sectorSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading sectors:', error);
    }
  }

  async loadMarketData() {
    try {
      await Promise.all([
        this.loadMarketAnalysis(),
        this.loadNews()
      ]);
    } catch (error) {
      console.error('Error loading market data:', error);
    }
  }

  async loadMarketAnalysis() {
    try {
      const response = await fetch(`/api/market-analysis/${this.currentMarket}`);
      const analysisData = await response.json();

      if (analysisData.error) {
        console.error('Error loading market analysis:', analysisData.error);
        return;
      }

      // Update sector metrics
      this.updateSectorMetrics(analysisData.sectors);

      // Update companies list
      this.updateCompaniesList(analysisData.top_companies, analysisData.micro_cap_companies);

      // Update chart with sector data
      this.updateChartWithAnalysis(analysisData.sectors);

    } catch (error) {
      console.error('Error loading market analysis:', error);
    }
  }

  async loadCompanies() {
    try {
      const response = await fetch(`/api/companies/${this.currentMarket}/${this.currentSector}`);
      const companies = await response.json();
      
      const companiesList = document.getElementById('companies-list');
      companiesList.innerHTML = '';
      
      if (companies.length === 0) {
        companiesList.innerHTML = '<p>No companies found for this sector.</p>';
        return;
      }
      
      companies.forEach(company => {
        const companyCard = document.createElement('div');
        companyCard.className = 'company-card';
        companyCard.innerHTML = `
          <h4>${company.name}</h4>
          <p>Market Cap: $${company.market_cap}B</p>
          <p class="growth-rate ${company.growth_rate >= 0 ? 'positive' : 'negative'}">
            Growth: ${company.growth_rate}%
          </p>
        `;
        companiesList.appendChild(companyCard);
      });
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }

  async loadNews() {
    try {
      const response = await fetch(`/api/news/${this.currentMarket}/${this.currentSector}`);
      const news = await response.json();
      
const newsContainer = document.getElementById('news-container');
newsContainer.innerHTML = '';

if (news.length === 0) {
newsContainer.innerHTML = '<p>No recent news available.</p>';
return;
}

news.forEach(item => {
const newsCard = document.createElement('div');
newsCard.className = 'news-card';

// Format published date
const publishedDate = new Date(item.published_at);
const timeAgo = this.getTimeAgo(publishedDate);

newsCard.innerHTML = `
<div class="news-timestamp">${publishedDate.toLocaleDateString()} - ${timeAgo}</div>
<h4>${item.title}</h4>
<p>${item.summary}</p>
<div class="news-meta">
<span class="sector-tag">${item.sector}</span>
<span class="source-system">${item.source_system || 'Unknown'}</span>
<span class="impact-score">Impact: ${item.impact_score}/10</span>
</div>
<button class="read-more-btn">Read More</button>
`;

  // Add click event for read more - simplified to always try opening the link first
  const readMoreBtn = newsCard.querySelector('.read-more-btn');
  readMoreBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Show loading state
    const originalText = readMoreBtn.textContent;
    readMoreBtn.textContent = 'Opening...';
    readMoreBtn.disabled = true;

    try {
      // Always try to open the original link first
      window.open(item.link, '_blank');

      // Restore button state after a short delay
      setTimeout(() => {
        readMoreBtn.textContent = originalText;
        readMoreBtn.disabled = false;
      }, 1000);

    } catch (error) {
      console.error('Error opening link:', error);

      // If opening fails, show fallback page as last resort
      const fallbackUrl = `/fallback.html?title=${encodeURIComponent(item.title)}&summary=${encodeURIComponent(item.summary || '')}&market=${encodeURIComponent(item.market)}&sector=${encodeURIComponent(item.sector)}&impactScore=${encodeURIComponent(item.impact_score)}&urlToImage=${encodeURIComponent(item.urlToImage || '')}&content=${encodeURIComponent(item.content || '')}&timestamp=${encodeURIComponent(item.timestamp)}`;
      window.open(fallbackUrl, '_blank');

      // Restore button state
      readMoreBtn.textContent = originalText;
      readMoreBtn.disabled = false;
    }
  });

newsContainer.appendChild(newsCard);
});

// Update the total news counter in the header
const totalNewsElement = document.getElementById('total-news');
if (totalNewsElement) {
  totalNewsElement.textContent = news.length;
}
    } catch (error) {
      console.error('Error loading news:', error);
      const newsContainer = document.getElementById('news-container');
      newsContainer.innerHTML = '<p class="error">Failed to load news. Please try again.</p>';
    }
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      return diffHours === 0 ? 'Just now' : `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
  }

  updateSectorMetrics(sectors) {
    // Find the current sector data
    const currentSectorData = sectors.find(sector => sector.name === this.currentSector);

    if (currentSectorData) {
      // Update past growth
      const pastGrowthElement = document.getElementById('past-growth');
      if (pastGrowthElement) {
        pastGrowthElement.textContent = currentSectorData.growth_data?.current ?
          `$${currentSectorData.growth_data.current.toLocaleString()}B` : '-';
      }

      // Update current growth
      const currentGrowthElement = document.getElementById('current-growth');
      if (currentGrowthElement) {
        currentGrowthElement.textContent = currentSectorData.growth_data?.current ?
          `$${currentSectorData.growth_data.current.toLocaleString()}B` : '-';
      }

      // Update future projection (removed as requested)
      const futureProjectionElement = document.getElementById('future-projection');
      if (futureProjectionElement) {
        futureProjectionElement.textContent = 'N/A';
      }

      // Update sector analysis details
      this.updateSectorAnalysis(currentSectorData);
    }
  }

  updateSectorAnalysis(sectorData) {
    // Update headwinds
    const headwindsList = document.getElementById('headwinds-list');
    if (headwindsList && sectorData.headwinds) {
      headwindsList.innerHTML = sectorData.headwinds.map(headwind =>
        `<li>${headwind}</li>`
      ).join('');
    }

    // Update tailwinds
    const tailwindsList = document.getElementById('tailwinds-list');
    if (tailwindsList && sectorData.tailwinds) {
      tailwindsList.innerHTML = sectorData.tailwinds.map(tailwind =>
        `<li>${tailwind}</li>`
      ).join('');
    }

    // Update valuations
    const valuationsInfo = document.getElementById('valuations-info');
    if (valuationsInfo && sectorData.valuations) {
      valuationsInfo.innerHTML = `
        <p><strong>Status:</strong> ${sectorData.valuations.status || 'N/A'}</p>
        <p><strong>Relative to Market:</strong> ${sectorData.valuations.relative_to_market || 'N/A'}</p>
        <p><strong>Historical Comparison:</strong> ${sectorData.valuations.historical_comparison || 'N/A'}</p>
      `;
    }

    // Update PEG ratio
    const pegRatioInfo = document.getElementById('peg-ratio-info');
    if (pegRatioInfo && sectorData.peg_ratio) {
      const ratioValue = pegRatioInfo.querySelector('.ratio-value');
      if (ratioValue) {
        ratioValue.textContent = sectorData.peg_ratio.toFixed(1);
      }
    }
  }

  updateCompaniesList(topCompanies, microCapCompanies) {
    const companiesList = document.getElementById('companies-list');
    companiesList.innerHTML = '';

    // Handle crypto market case
    if (this.currentMarket === 'Crypto') {
      companiesList.innerHTML = '<p>Cryptocurrency market does not have traditional company listings.</p>';
      return;
    }

    // Display top 10 companies
    if (topCompanies && topCompanies.length > 0) {
      const topCompaniesSection = document.createElement('div');
      topCompaniesSection.innerHTML = '<h4>Top 10 Companies by Market Cap</h4>';

      topCompanies.forEach(company => {
        const companyCard = document.createElement('div');
        companyCard.className = 'company-card';
        companyCard.innerHTML = `
          <h4>${company.name}</h4>
          <p>Market Cap: $${company.market_cap ? company.market_cap.toLocaleString() : 0}B</p>
          <p class="growth-rate ${company.growth_rate >= 0 ? 'positive' : 'negative'}">
            Growth: ${company.growth_rate || 0}%
          </p>
          <p class="sector-info">Sector: ${company.sector}</p>
        `;
        topCompaniesSection.appendChild(companyCard);
      });

      companiesList.appendChild(topCompaniesSection);
    }

    // Display emerging companies
    if (microCapCompanies && microCapCompanies.length > 0) {
      const emergingCompaniesSection = document.createElement('div');
      emergingCompaniesSection.innerHTML = '<h4>Emerging Companies (Micro/Small Cap)</h4>';

      microCapCompanies.forEach(company => {
        const companyCard = document.createElement('div');
        companyCard.className = 'company-card emerging';
        companyCard.innerHTML = `
          <h4>${company.name}</h4>
          <p>Market Cap: $${company.market_cap ? company.market_cap.toLocaleString() : 0}B</p>
          <p class="growth-rate ${company.growth_rate >= 0 ? 'positive' : 'negative'}">
            Growth: ${company.growth_rate || 0}%
          </p>
          <p class="sector-info">Sector: ${company.sector}</p>
        `;
        emergingCompaniesSection.appendChild(companyCard);
      });

      companiesList.appendChild(emergingCompaniesSection);
    }

    if ((!topCompanies || topCompanies.length === 0) && (!microCapCompanies || microCapCompanies.length === 0)) {
      companiesList.innerHTML = '<p>No companies found for this market.</p>';
    }
  }

  updateChartWithAnalysis(sectors) {
    // Find the current sector data
    const currentSectorData = sectors.find(sector => sector.name === this.currentSector);

    if (!currentSectorData) {
      console.error('Current sector data not found');
      return;
    }

    // Generate sample historical data for the chart
    this.updateChartWithSampleData(currentSectorData);
  }

  updateChartWithSampleData(sectorData) {
    const ctx = document.getElementById('growth-chart').getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    // Generate sample historical data (10 years)
    const years = [];
    const values = [];
    const baseValue = sectorData.market_cap || 1000000000; // $1B base

    for (let i = 0; i < 10; i++) {
      const year = 2015 + i;
      years.push(year.toString());

      // Simulate growth with some randomness
      const growthMultiplier = 1 + (Math.random() * 0.4 - 0.1); // -10% to +30% growth
      const marketCap = baseValue * Math.pow(growthMultiplier, i);
      values.push(Math.round(marketCap / 1000000000 * 100) / 100); // Convert to billions
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: `${this.currentSector} Market Value (USD Billions)`,
          data: values,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: `${this.currentMarket} - ${this.currentSector} Sector Analysis (10-Year Trend)`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}B`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Year'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Market Value (USD Billions)'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString() + 'B';
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  updateChart(sectorData) {
    const ctx = document.getElementById('growth-chart').getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    // Extract years and values from the data
    const labels = sectorData.map(item => item.past_growth); // Years are stored in past_growth field
    const values = sectorData.map(item => parseFloat(item.current_growth)); // Dollar values are in current_growth field

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.currentSector} Market Value (USD Billions)`,
          data: values,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: `${this.currentMarket} - ${this.currentSector} Sector Analysis (10-Year Trend)`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}B`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Year'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Market Value (USD Billions)'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString() + 'B';
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  setupEventListeners() {
    const sectorSelect = document.getElementById('sector-select');
    sectorSelect.addEventListener('change', (e) => {
      this.currentSector = e.target.value;
      if (this.currentSector) {
        this.loadMarketData();
      }
    });

    const refreshBtn = document.getElementById('refresh-data');
    refreshBtn.addEventListener('click', () => {
      this.loadMarketData();
      this.showSuccess('Data refreshed successfully');
    });

    const refreshNewsBtn = document.getElementById('refresh-news');
    refreshNewsBtn.addEventListener('click', async () => {
      try {
        // Show loading state
        const originalText = refreshNewsBtn.textContent;
        refreshNewsBtn.textContent = 'Refreshing...';
        refreshNewsBtn.disabled = true;

        // Call the refresh news API
        const response = await fetch('/api/refresh-news', {
          method: 'POST'
        });

        if (response.ok) {
          const result = await response.json();
          this.showSuccess('News refreshed successfully');
          // Reload news data
          await this.loadNews();
        } else {
          throw new Error('Failed to refresh news');
        }
      } catch (error) {
        console.error('Error refreshing news:', error);
        this.showError('Failed to refresh news. Please try again.');
      } finally {
        // Restore button state
        refreshNewsBtn.textContent = 'Refresh News';
        refreshNewsBtn.disabled = false;
      }
    });

    // Setup market tab event listeners
    const marketTabs = document.querySelectorAll('.tab-btn');
    marketTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const market = tab.getAttribute('data-market');
        this.switchMarket(market);
      });
    });
  }

  switchMarket(market) {
    this.currentMarket = market;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-market') === market);
    });
    
    this.loadMarketData();
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadMarketData();
    }, 30000); // Refresh every 30 seconds
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Validate if a link is reachable
  async validateLink(url) {
    try {
      // For same-origin URLs, we can use fetch with HEAD method
      if (url.startsWith(window.location.origin)) {
        const response = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors' // This allows cross-origin requests but limits response info
        });
        return true; // If no error thrown, consider it reachable
      }

      // For external URLs, we'll use a proxy approach or simple fetch
      // Since we can't make direct cross-origin HEAD requests from browser,
      // we'll try a GET request with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // If HEAD fails, try GET request (some servers block HEAD)
        try {
          const getController = new AbortController();
          const getTimeoutId = setTimeout(() => getController.abort(), 3000);

          const getResponse = await fetch(url, {
            method: 'GET',
            signal: getController.signal,
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });

          clearTimeout(getTimeoutId);
          return getResponse.ok;
        } catch (getError) {
          return false;
        }
      }
    } catch (error) {
      console.log(`Link validation failed for ${url}:`, error.message);
      return false;
    }
  }

  showNewsDetail(newsItem) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'news-modal-overlay';

    // Format published date
    const publishedDate = new Date(newsItem.published_at);
    const fullDate = publishedDate.toLocaleString();

    modal.innerHTML = `
      <div class="news-modal">
        <div class="modal-header">
          <h2>${newsItem.title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-content">
          <div class="modal-meta">
            <span class="modal-market">${newsItem.market}</span>
            <span class="modal-sector">${newsItem.sector}</span>
            <span class="modal-impact">Impact Score: ${newsItem.impact_score}/10</span>
            <span class="modal-date">${fullDate}</span>
          </div>
          <div class="modal-summary">
            <h3>Summary</h3>
            <p>${newsItem.summary}</p>
          </div>
          <div class="modal-analysis">
            <h3>Market Analysis</h3>
            <p>This news article affects the ${newsItem.sector} sector in the ${newsItem.market} market with a significant impact score of ${newsItem.impact_score}/10. Investors should monitor related companies and sector trends for potential opportunities or risks.</p>
          </div>
        </div>
      </div>
    `;

    // Add to body
    document.body.appendChild(modal);

    // Close modal on overlay click or close button
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close')) {
        modal.remove();
      }
    });

    // Prevent modal content clicks from closing
    const modalContent = modal.querySelector('.news-modal');
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new NewsActionsApp();
});
