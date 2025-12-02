// API Configuration - Auto-detect environment and API base URL
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = 'http://localhost:3000'; // Local development - Node.js server
} else if (window.location.hostname.includes('vercel.app') ||
           window.location.hostname.includes('vercel-preview')) {
    // Vercel deployment - use relative URLs for same domain
    API_BASE_URL = '';
} else {
    // Production domain - use current domain
    API_BASE_URL = window.location.protocol + '//' + window.location.hostname;
    if (window.location.port && window.location.port !== '80' && window.location.port !== '443') {
        API_BASE_URL += ':' + window.location.port;
    }
}

console.log('🌐 API Base URL:', API_BASE_URL || '(relative - same domain)');

// Supabase configuration
const SUPABASE_URL = 'https://qqzyizvglvxkupssowex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxenlpenZnbHZ4a3Vwc3Nvd2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjg5NjksImV4cCI6MjA3ODkwNDk2OX0.F5Y1TCuWwmN3kxTX5HyvGFQ5fSXyba7F41M99bvA-DU';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// User preferences and filter state
let userPreferences = { read_later: [], watchlist: [], favorites: [] };
let filterMode = 'all'; // 'all' or 'read_later'

// Auth state management
let currentUser = null;

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userSection = document.getElementById('user-section');
const userName = document.querySelector('.user-name');
const userEmail = document.querySelector('.user-email');

// Initialize auth
async function initAuth() {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        updateAuthUI(true);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            currentUser = session.user;
            updateAuthUI(true);
        } else {
            currentUser = null;
            updateAuthUI(false);
        }
    });
}

// Update auth UI
function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        loginBtn.style.display = 'none';
        // logoutBtn removed from header in Sub-Phase 3.2 - logout available in navigation panel
        userSection.style.display = 'flex';

        // Update user info
        if (currentUser) {
            userName.textContent = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
            userEmail.textContent = currentUser.email;

            // Show logout in navigation
            document.getElementById('logout-nav').style.display = 'list-item';
        }

        // Load user data
        loadUserData();
    } else {
        loginBtn.style.display = 'inline-block';
        // logoutBtn removed from header in Sub-Phase 3.2 - logout available in navigation panel
        userSection.style.display = 'none';

        // Hide logout from navigation
        document.getElementById('logout-nav').style.display = 'none';

        // Clear user data
        clearUserData();
    }
}

// Login with Google
async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

// Logout
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Logout error:', error);
    }
}

// Navigation functions
function navigateToHome() {
    // Reset to home state
    currentMarket = 'US';
    currentSector = '';
    currentSearch = '';
    currentPage = 1;

    // Update market tabs
    updateMarketTabs();

    // Load news
    loadNews(1);
}

function toggleWatchlistSubmenu(event) {
    event.preventDefault();
    const arrow = document.getElementById('watchlist-arrow');
    const submenu = document.getElementById('watchlist-submenus');

    arrow.classList.toggle('rotated');
    submenu.classList.toggle('show');
}

// Modal management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Initialize modal close handlers
function initModals() {
    // Close modal when clicking outside or on close button
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
}

// News state
let currentPage = 1;
let currentMarket = 'US';
let currentSector = '';
let currentSearch = '';

// DOM elements for market tabs
const marketLinks = document.querySelectorAll('.market-nav-link');
const newsContainer = document.querySelector('.news-container');
const paginationContainer = document.getElementById('pagination-container');

// Initialize market tabs
function initMarketTabs() {
    marketLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const market = e.target.getAttribute('data-market');

            // Update active state
            marketLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');

            // Update current market and reset state
            currentMarket = market;
            currentSector = '';
            currentSearch = '';
            currentPage = 1;

            // Load news for new market
            loadNews(1);
        });
    });
}

// Update market tabs active state
function updateMarketTabs() {
    marketLinks.forEach(link => {
        if (link.getAttribute('data-market') === currentMarket) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Load markets
async function loadMarkets() {
    try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        marketSelect.innerHTML = '<option value="">All Markets</option>';
        data.markets.forEach(market => {
            const option = document.createElement('option');
            option.value = market;
            option.textContent = market;
            if (market === currentMarket) option.selected = true;
            marketSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load markets:', error);
    }
}

// Load sectors
async function loadSectors() {
    try {
        const response = await fetch(`/api/sectors?market=${currentMarket}`);
        const data = await response.json();
        sectorSelect.innerHTML = '<option value="">All Sectors</option>';
        data.sectors.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector;
            option.textContent = sector;
            sectorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load sectors:', error);
    }
}

// Load news
async function loadNews(page = 1) {
    try {
        newsContainer.innerHTML = '<p>Loading news...</p>';

        const params = new URLSearchParams({
            market: currentMarket,
            page: page.toString(),
            limit: '12'
        });

        if (currentSector) params.append('sector', currentSector);
        if (currentSearch) params.append('search', currentSearch);

        const response = await fetch(`/api/news/business-bites?${params}`);
        const data = await response.json();

        displayNews(data.articles);
        updatePagination(data.pagination);
    } catch (error) {
        console.error('Failed to load news:', error);
        newsContainer.innerHTML = '<p>Error loading news. Please try again.</p>';
    }
}

// Display news articles
function displayNews(articles) {
    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = '<p>No articles found.</p>';
        return;
    }

    newsContainer.innerHTML = '';

    articles.forEach(article => {
        const articleElement = createArticleElement(article);
        newsContainer.appendChild(articleElement);
    });

    // Re-initialize Lucide icons for dynamically created content
    refreshLucideIcons();
}

// Create article element
function createArticleElement(article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'news-card-link';

    const articleCard = document.createElement('div');
    articleCard.className = 'news-card';
    articleCard.onclick = () => openPrimaryArticle(article.link || '#');

    // Handle external images through proxy to avoid CORS issues in Vercel
    let imageUrl;

    if (article.thumbnail_url) {
        // Use thumbnail_url from database (local/relative or proxy for external)
        imageUrl = getProxiedImageUrl(article.thumbnail_url);
    } else if (article.urlToImage) {
        // Use urlToImage from database (proxy for external images)
        imageUrl = getProxiedImageUrl(article.urlToImage);
    } else if (article.enhanced_metadata && article.enhanced_metadata.thumbnail_url) {
        // Fallback to enhanced metadata if available
        imageUrl = getProxiedImageUrl(article.enhanced_metadata.thumbnail_url);
    } else {
        // Generate unique SVG placeholder based on article ID and title
        imageUrl = generateUniquePlaceholder(article.id, article.title || 'Article');
    }
    const impactColor = getImpactColor(article.impact_score);
    const sentimentColor = getSentimentColor(article.sentiment);

    // Check if article has multi-result metadata
    const hasMultiResults = article.multi_metadata_results && article.multi_metadata_results.length > 1;
    const winnerRank = article.enhanced_metadata ? article.enhanced_metadata.winner_rank : null;
    const hasThumbnail = article.enhanced_metadata && article.enhanced_metadata.thumbnail_url;

    // Get source and author from article fields
    const newsSource = article.source_system || article.source || 'Unknown';
    const newsAuthor = article.author || '';  // Keep blank if no author

    // Check if article is already in Read Later
    const isInReadLater = userPreferences.read_later.some(item => parseInt(item.article_id) === parseInt(article.id));
    const readLaterIconClass = isInReadLater ? 'read-later-icon saved' : 'read-later-icon';
    const readLaterTitle = isInReadLater ? 'Remove from Read Later' : 'Add to Read Later';

    articleCard.innerHTML = `
        <!-- Title on top (full width) -->
        <div class="news-title-top">
            <h3 class="news-title">${article.title || 'No Title Available'}</h3>
            <!-- Read Later Icon -->
            <div class="${readLaterIconClass}" data-article-id="${article.id}" data-action="${isInReadLater ? 'remove' : 'add'}" title="${readLaterTitle}" onclick="handleReadLaterClick(event, '${article.id}', '${isInReadLater ? 'remove' : 'add'}')">
                <i data-lucide="book-open"></i>
            </div>
        </div>

        <!-- Image and content row -->
        <div class="news-content-row">
            <!-- Image on left -->
            <div class="news-image-container">
                <img src="${imageUrl}" alt="${article.title}" class="news-image" onerror="handleImageError(this)">
            </div>

            <!-- Title and description on right -->
            <div class="news-text-content">
                <h4 class="news-title-small">${article.title || 'No Title Available'}</h4>
                <div class="news-summary">
                    ${article.summary ? article.summary.substring(0, 150) + (article.summary.length > 150 ? '...' : '') : 'No summary available.'}
                </div>
            </div>
        </div>

        <!-- Sector • Source • Author -->
        <div class="news-meta-bottom">
            <span class="meta-sector">${article.sector || 'General'}</span>
            <span class="meta-separator">•</span>
            <span class="meta-source">${newsSource}</span>
            <span class="meta-separator">•</span>
            <span class="meta-author">${newsAuthor}</span>
        </div>

        <!-- Published Date • Impact:Score • Sentiment -->
        <div class="news-published-row">
            <span class="published-date">${article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</span>
            <span class="meta-separator">•</span>
            <span class="impact-score">Impact:${article.impact_score || ''}</span>
            <span class="meta-separator">•</span>
            <span class="sentiment-score">${article.sentiment ? article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1) : 'Neutral'}</span>
        </div>
    `;

    articleDiv.appendChild(articleCard);

    // Source hyperlinks as separate rows - outside the main card click area
    const sourceLinksContainer = document.createElement('div');
    sourceLinksContainer.className = 'news-source-links';

    if (article.source_links && article.source_links.length > 0) {
        article.source_links.slice(0, 5).forEach((source, index) => {
            const sourceRow = document.createElement('div');
            sourceRow.className = 'source-link-row';
            sourceRow.onclick = () => openSourceArticle(source.url || article.link);
            sourceRow.innerHTML = `
                ${(source.title || article.title || '').substring(0, 20)} -- ${source.source || newsSource} -- ${source.published_at ? timeAgo(new Date(source.published_at)) : ''}
                <span class="source-link-icon">🔗</span>
            `;
            sourceLinksContainer.appendChild(sourceRow);
        });
    } else {
        const sourceRow = document.createElement('div');
        sourceRow.className = 'source-link-row';
        sourceRow.onclick = () => openSourceArticle(article.link);
        sourceRow.innerHTML = `
            ${(article.title || '').substring(0, 20)} -- ${newsSource} -- ${article.published_at ? timeAgo(new Date(article.published_at)) : ''}
            <span class="source-link-icon">🔗</span>
        `;
        sourceLinksContainer.appendChild(sourceRow);
    }

    articleDiv.appendChild(sourceLinksContainer);

    return articleDiv;
}

// Get initials for article image
function getInitials(text) {
    if (!text) return '?';
    const words = text.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
}

// Update pagination
function updatePagination(pagination) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = pagination.page <= 1;
    prevBtn.onclick = () => {
        if (pagination.page > 1) {
            loadNews(pagination.page - 1);
        }
    };
    paginationContainer.appendChild(prevBtn);

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.id = 'page-info';
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    paginationContainer.appendChild(pageInfo);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    nextBtn.onclick = () => {
        loadNews(pagination.page + 1);
    };
    paginationContainer.appendChild(nextBtn);
}

// Toggle bookmark
async function toggleBookmark(articleId, button) {
    if (!currentUser) {
        alert('Please login to bookmark articles');
        return;
    }

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            alert('Authentication session expired. Please login again.');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        };

        if (button.textContent === 'Bookmark') {
            // Add bookmark
            const response = await fetch('/api/user/read-later', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    article_id: articleId,
                    title: button.parentElement.querySelector('h3').textContent,
                    url: button.parentElement.querySelector('.article-sources a')?.href || '#',
                    sector: button.parentElement.querySelector('.article-meta span:nth-child(2)').textContent.replace('Sector: ', ''),
                    source_system: 'web'
                })
            });

            if (response.ok) {
                button.textContent = 'Bookmarked';
                button.classList.add('bookmarked');
            } else {
                const errorData = await response.json();
                alert('Failed to bookmark article: ' + (errorData.error || 'Unknown error'));
            }
        } else {
            // Remove bookmark
            const response = await fetch('/api/user/read-later', {
                method: 'DELETE',
                headers: headers,
                body: JSON.stringify({ article_id: articleId })
            });

            if (response.ok) {
                button.textContent = 'Bookmark';
                button.classList.remove('bookmarked');
            } else {
                const errorData = await response.json();
                alert('Failed to remove bookmark: ' + (errorData.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Bookmark error:', error);
        alert('Failed to update bookmark: ' + error.message);
    }
}

// Load user data
function loadUserData() {
    console.log('User logged in:', currentUser.email);
    // Load user bookmarks, watchlists, etc.
    loadUserBookmarks();
}

// Clear user data
function clearUserData() {
    console.log('User logged out');
    // Clear user-specific data
}

// Load user bookmarks (placeholder)
async function loadUserBookmarks() {
    if (!currentUser) {
        window.userBookmarks = new Set();
        return;
    }

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            console.warn('No access token available for bookmarks');
            window.userBookmarks = new Set();
            return;
        }

        const response = await fetch('/api/user/read-later', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('Bookmarks API returned error:', response.status, response.statusText);
            window.userBookmarks = new Set();
            return;
        }

        const data = await response.json();

        if (data.bookmarks && Array.isArray(data.bookmarks)) {
            // Store bookmarks for UI updates
            window.userBookmarks = new Set(data.bookmarks.map(b => b.article_id));
            updateBookmarkButtons();
        } else {
            console.warn('Invalid bookmarks response format:', data);
            window.userBookmarks = new Set();
        }
    } catch (error) {
        console.warn('Failed to load bookmarks (API may be down):', error.message);
        window.userBookmarks = new Set();
        // Don't show error to user - API failures shouldn't break the app
    }
}

// Update bookmark buttons
function updateBookmarkButtons() {
    const buttons = document.querySelectorAll('.bookmark-btn');
    buttons.forEach(button => {
        const articleId = button.parentElement.dataset.articleId;
        if (window.userBookmarks?.has(articleId)) {
            button.textContent = 'Bookmarked';
            button.classList.add('bookmarked');
        }
    });
}

// Navigation event listeners
function initNavigation() {
    // Navigation links
    document.querySelectorAll('[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const navType = e.target.closest('[data-nav]').getAttribute('data-nav');
            openModal(`${navType}-modal`);
        });
    });

    // Search modal handlers
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput?.value?.trim();
            if (query) {
                currentSearch = query;
                currentPage = 1;
                loadNews(1);
                closeModal('search-modal');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn?.click();
            }
        });
    }

    // User assist tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            switchUserAssistTab(tab);
        });
    });

    // User assist form
    const userAssistForm = document.getElementById('user-assist-form');
    if (userAssistForm) {
        userAssistForm.addEventListener('submit', handleUserAssistSubmit);
    }
}

function switchUserAssistTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Update form title
    const title = document.getElementById('submit-section-title');
    if (title) {
        title.textContent = tab === 'bug-reports' ? 'Report Bug' : 'Request Feature';
    }
}

async function handleUserAssistSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please login to submit issues');
        return;
    }

    const title = document.getElementById('issue-title').value;
    const description = document.getElementById('issue-description').value;
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    const issueType = activeTab === 'bug-reports' ? 'bug' : 'feature';

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            alert('Authentication session expired. Please login again.');
            return;
        }

        const response = await fetch('/api/user-assist', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                issue_type: issueType,
                source_system: 'web'
            })
        });

        if (response.ok) {
            alert('Issue submitted successfully!');
            e.target.reset();
            // Refresh submissions list
            loadUserAssistSubmissions();
        } else {
            const errorData = await response.json();
            alert('Failed to submit issue: ' + (errorData.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Submit error:', error);
        alert('Failed to submit issue: ' + error.message);
    }
}

async function loadUserAssistSubmissions() {
    if (!currentUser) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch('/api/user-assist', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const data = await response.json();
        displayUserAssistSubmissions(data.submissions || []);
    } catch (error) {
        console.error('Failed to load submissions:', error);
    }
}

function displayUserAssistSubmissions(submissions) {
    const container = document.getElementById('submissions-list');
    if (!container) return;

    if (!submissions || submissions.length === 0) {
        container.innerHTML = '<p>No submissions yet.</p>';
        return;
    }

    container.innerHTML = submissions.map(sub => `
        <div class="submission-item">
            <div class="submission-header">
                <h4>${sub.title}</h4>
                <span class="submission-status status-${sub.status}">${sub.status}</span>
            </div>
            <p>${sub.description}</p>
            <div class="submission-meta">
                <span>Type: ${sub.issue_type}</span>
                <span>Submitted: ${new Date(sub.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

// Event listeners
loginBtn.addEventListener('click', loginWithGoogle);
// Note: logoutBtn removed from header in Sub-Phase 3.2 - logout available in navigation panel
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    initAuth();
    initMarketTabs();
    initModals();
    initNavigation();

    // Load initial data
    loadNews(1);
});

// Utility functions for news tiles
function getImpactColor(score) {
    if (score >= 8.5) return 'linear-gradient(135deg, #28a745, #20c997)';
    if (score >= 7.5) return 'linear-gradient(135deg, #17a2b8, #6f42c1)';
    if (score >= 6.5) return 'linear-gradient(135deg, #ffc107, #fd7e14)';
    if (score >= 5.5) return 'linear-gradient(135deg, #dc3545, #c82333)';
    return 'linear-gradient(135deg, #6c757d, #495057)';
}

function getSentimentColor(sentiment) {
    if (!sentiment) return 'linear-gradient(135deg, #6c757d, #495057)'; // neutral/unknown
    sentiment = sentiment.toLowerCase();
    if (sentiment === 'positive') return 'linear-gradient(135deg, #28a745, #20c997)';
    if (sentiment === 'negative') return 'linear-gradient(135deg, #dc3545, #c82333)';
    return 'linear-gradient(135deg, #ffc107, #fd7e14)'; // neutral
}

function timeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

function openPrimaryArticle(url) {
    // Check if user is logged in using Supabase auth state
    if (!currentUser) {
        showLoginModal();
        return;
    }

    window.open(url, '_blank');
}

function openSourceArticle(url) {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
    if (!isLoggedIn) {
        showLoginModal();
        return;
    }

    window.open(url, '_blank');
}

// Handle Read Later icon clicks - prevent card click and provide immediate feedback
function handleReadLaterClick(event, articleId, action) {
    // Prevent the event from bubbling up to the card click handler
    event.stopPropagation();
    event.preventDefault();

    // Find the icon element that was clicked
    const iconElement = event.target.closest('.read-later-icon');
    if (!iconElement) return;

    // Prevent multiple rapid clicks
    if (iconElement.classList.contains('processing')) return;
    iconElement.classList.add('processing');

    // Optimistically update UI immediately
    const wasSaved = iconElement.classList.contains('saved');
    const newAction = wasSaved ? 'remove' : 'add';

    // Toggle the visual state immediately
    iconElement.classList.toggle('saved');
    iconElement.setAttribute('data-action', newAction);
    iconElement.setAttribute('title', wasSaved ? 'Add to Read Later' : 'Remove from Read Later');

    // Update local state immediately
    if (wasSaved) {
        // Removing: remove from local array by article_id
        userPreferences.read_later = userPreferences.read_later.filter(item => parseInt(item.article_id) !== parseInt(articleId));
    } else {
        // Adding to local array, but keep as objects for consistency
        const exists = userPreferences.read_later.some(item => parseInt(item.article_id) === parseInt(articleId));
        if (!exists) {
            userPreferences.read_later.push({ article_id: parseInt(articleId) });
        }
    }

    // Check if user is logged in before making API calls
    const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
    if (!isLoggedIn || !currentUser || !currentUser.user_id) {
        revertOptimisticUpdate(iconElement, wasSaved, articleId, newAction === 'add' ? 'add' : 'remove', 'You must be logged in to manage your Read Later list');
        showLoginModal();
        return;
    }

    // Now make the API call in the background
    if (newAction === 'add') {
        // Add to read later via API
        fetch(`${API_BASE_URL}/api/user-preferences/add/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                preference_type: 'read_later',
                item_id: articleId,
                item_type: 'article'
            })
        })
        .then(response => response.json())
        .then(data => {
            iconElement.classList.remove('processing');
            if (data.success) {
                showNotification('Article added to Read Later', 'success');
                // Refresh the view to update any other UI elements
                if (filterMode === 'read_later') {
                    loadNews();
                }
            } else {
                // Revert optimistic update on error
                revertOptimisticUpdate(iconElement, wasSaved, articleId, 'add', data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error adding to Read Later:', error);
            revertOptimisticUpdate(iconElement, wasSaved, articleId, 'add', error.message);
        });
    } else {
        // Remove from read later via API
        fetch(`${API_BASE_URL}/api/user/read-later/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                article_id: articleId
            })
        })
        .then(response => response.json())
        .then(data => {
            iconElement.classList.remove('processing');
            if (data.success) {
                showNotification('Article removed from Read Later', 'success');
                // Refresh the view to update filtering
                if (filterMode === 'read_later') {
                    loadNews();
                }
            } else {
                // Revert optimistic update on error
                revertOptimisticUpdate(iconElement, wasSaved, articleId, 'remove', data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error removing from Read Later:', error);
            revertOptimisticUpdate(iconElement, wasSaved, articleId, 'remove', error.message);
        });
    }

    return false; // Additional prevention
}

// Helper function to revert optimistic UI updates on API error
function revertOptimisticUpdate(iconElement, originalWasSaved, articleId, operation, errorMessage) {
    // Revert the visual state
    iconElement.classList.remove('processing');

    if (originalWasSaved) {
        iconElement.classList.add('saved');
        iconElement.setAttribute('data-action', 'remove');
        iconElement.setAttribute('title', 'Remove from Read Later');
        // Re-add to local array
        const exists = userPreferences.read_later.some(item => parseInt(item.article_id) === parseInt(articleId));
        if (!exists) {
            userPreferences.read_later.push({ article_id: parseInt(articleId) });
        }
    } else {
        iconElement.classList.remove('saved');
        iconElement.setAttribute('data-action', 'add');
        iconElement.setAttribute('title', 'Add to Read Later');
        // Remove from local array
        userPreferences.read_later = userPreferences.read_later.filter(item => parseInt(item.article_id) !== parseInt(articleId));
    }

    // Show error notification
    showNotification(`Failed to ${operation === 'add' ? 'add to' : 'remove from'} Read Later: ${errorMessage}`, 'error');
}

// Standardized auth modal - always uses direct Google OAuth
function showAuthModal() {
    // Directly trigger Google OAuth instead of showing demo modal
    loginWithGoogle();
}

// Keep showLoginModal for backward compatibility but redirect to standardized auth
function showLoginModal() {
    showAuthModal();
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.remove();
    }
    window.loginCallback = null;
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 400px;
    `;

    // Set background color based on type
    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else {
        notification.style.backgroundColor = '#17a2b8';
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Handle external images through proxy to avoid CORS issues in Vercel
function getProxiedImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return null;
    }

    // Check if it's already a data URL (SVG placeholder)
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }

    // Check if it's a relative URL (no protocol or starts with /)
    if (imageUrl.startsWith('/') || !imageUrl.includes('://')) {
        return imageUrl; // Use directly for local/relative images
    }

    // For external URLs, use the proxy
    try {
        const url = new URL(imageUrl);
        // Only proxy HTTPS URLs to avoid mixed content
        if (url.protocol === 'https:') {
            return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        }
    } catch (error) {
        console.warn('Invalid image URL:', imageUrl);
        return null;
    }

    // For HTTP URLs or invalid URLs, return null to trigger placeholder
    return null;
}

// Generate unique SVG placeholder for each article
function generateUniquePlaceholder(articleId, title) {
    // Create a simple hash from article ID for consistent colors
    const hash = articleId.toString().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);

    // Generate consistent colors based on hash
    const colors = [
        '#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#fce4ec',
        '#e0f2f1', '#f9fbe7', '#efebe9', '#e8eaf6', '#fce4ec'
    ];
    const bgColor = colors[Math.abs(hash) % colors.length];

    const textColors = [
        '#1976d2', '#7b1fa2', '#388e3c', '#f57c00', '#c2185b',
        '#00695c', '#689f38', '#5d4037', '#303f9f', '#ad1457'
    ];
    const textColor = textColors[Math.abs(hash) % textColors.length];

    // Get first letter of title or use a default
    const initial = (title && title.length > 0) ? title.charAt(0).toUpperCase() : 'N';

    // Create SVG data URL
    const svg = `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="48" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${initial}</text>
        <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="14" fill="${textColor}" text-anchor="middle">No Image</text>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Handle image loading errors - better fallback for Vercel CORS issues
function handleImageError(imgElement) {
    // Only try the fallback once to avoid infinite loops
    if (!imgElement.dataset.fallbackTried) {
        imgElement.dataset.fallbackTried = 'true';
        // Generate unique placeholder based on article data
        const articleCard = imgElement.closest('.news-card');
        const articleId = articleCard?.querySelector('[data-article-id]')?.getAttribute('data-article-id') || 'unknown';
        const title = imgElement.alt || 'Article';
        imgElement.src = generateUniquePlaceholder(articleId, title);
    }
}

// Refresh Lucide icons for dynamically created content
function refreshLucideIcons() {
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}

// Export for potential use in other scripts
window.app = {
    supabase,
    currentUser,
    loginWithGoogle,
    logout,
    handleImageError
};
