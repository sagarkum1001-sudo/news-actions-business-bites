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

// UNIQUE VERIFICATION: Vercel Cache Bust Test - 2025-12-23-07:25
console.log('🚀 UNIQUE VERIFICATION: Updated app.js loaded successfully - Cache busting worked!');

// Initialize Supabase client (fix for Supabase v2 UMD) - Force redeploy
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client initialized successfully');

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

        // Set authentication state in localStorage
        localStorage.setItem('user_logged_in', 'true');

        // Update user info
        if (currentUser) {
            userName.textContent = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
            userEmail.textContent = currentUser.email;

            // Show logout in navigation
            document.getElementById('logout-nav').style.display = 'list-item';
        }

        // Load user data and preferences
        loadUserData();
    } else {
        loginBtn.style.display = 'inline-block';
        // logoutBtn removed from header in Sub-Phase 3.2 - logout available in navigation panel
        userSection.style.display = 'none';

        // Clear authentication state from localStorage
        localStorage.removeItem('user_logged_in');

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
    // Reset to home state but keep current market selection
    currentSector = '';
    currentSearch = '';
    currentPage = 1;

    // Hide summary section when navigating home (summary is only for watchlist views)
    const summarySection = document.getElementById('summary-section');
    if (summarySection) {
        summarySection.style.display = 'none';
    }

    // Update market tabs
    updateMarketTabs();

    // Load news
    loadNews();
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
let currentMarket = '';  // Default to all markets instead of US
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

            // Hide summary section when navigating to market tabs (summary is only for watchlist views)
            const summarySection = document.getElementById('summary-section');
            if (summarySection) {
                summarySection.style.display = 'none';
            }

            // Load news for new market
            loadNews();
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

// Load news
async function loadNews() {
    try {
        // Ensure news container is visible and has grid layout
        newsContainer.style.display = 'grid';
        newsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        newsContainer.style.gap = '1.5rem';

        newsContainer.innerHTML = '<p>Loading news...</p>';

        const params = new URLSearchParams({
            market: currentMarket
        });

        if (currentSector) params.append('sector', currentSector);
        if (currentSearch) params.append('search', currentSearch);

        const response = await fetch(`/api/news?${params}`);
        const data = await response.json();

        displayNews(data.articles);

        // Hide pagination completely for main news feed
        const paginationContainer = document.getElementById('pagination-container');
        if (paginationContainer) {
            paginationContainer.innerHTML = ''; // Clear any existing pagination
            paginationContainer.style.display = 'none';
        }
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

    // Load watchlist data for navigation submenus
    loadWatchlistDataForSubmenus();
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
        // Get the JWT token - try multiple methods to ensure we get a valid token
        let token = null;

        // Method 1: Try getting from current session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            token = session.access_token;
        }

        // Method 2: If no token from session, try getting user directly
        if (!token) {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (user && !userError) {
                // Get fresh session
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                if (freshSession?.access_token) {
                    token = freshSession.access_token;
                }
            }
        }

        if (!token) {
            console.warn('No access token available for bookmarks - user may need to re-authenticate');
            window.userBookmarks = new Set();
            return;
        }

        console.log('Using access token for bookmarks API call');

        const response = await fetch('/api/user/read-later', {
            headers: {
                'Authorization': `Bearer ${token}`,
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
            const bookmarkIds = data.bookmarks.map(b => b.article_id);
            window.userBookmarks = new Set(bookmarkIds);

            // Also update userPreferences for consistency
            userPreferences.read_later = data.bookmarks.map(b => ({
                article_id: parseInt(b.article_id),
                title: b.title,
                added_at: b.added_at
            }));

            updateBookmarkButtons();
            console.log('Loaded user bookmarks:', bookmarkIds.length, 'articles');
        } else {
            console.warn('Invalid bookmarks response format:', data);
            window.userBookmarks = new Set();
            userPreferences.read_later = [];
        }
    } catch (error) {
        console.warn('Failed to load bookmarks (API may be down):', error.message);
        window.userBookmarks = new Set();
        userPreferences.read_later = [];
        // Don't show error to user - API failures shouldn't break the app
    }
}

// Load and display read-later articles in modal
async function loadReadLaterArticles() {
    const readLaterList = document.getElementById('read-later-list');
    if (!readLaterList) {
        console.error('Read later list element not found');
        return;
    }

    // Show loading state
    readLaterList.innerHTML = '<div class="loading">Loading your saved articles...</div>';

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            readLaterList.innerHTML = '<div class="error">Authentication session expired. Please login again.</div>';
            return;
        }

        const response = await fetch('/api/user/read-later', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Read later API error:', response.status, response.statusText);
            readLaterList.innerHTML = '<div class="error">Failed to load saved articles. Please try again.</div>';
            return;
        }

        const data = await response.json();

        if (!data.bookmarks || !Array.isArray(data.bookmarks) || data.bookmarks.length === 0) {
            readLaterList.innerHTML = '<div class="empty-state">No saved articles yet. Click the book icon on articles to save them for later!</div>';
            // Open modal even with empty state
            openModal('read-later-modal');
            return;
        }

        // Display the saved articles
        readLaterList.innerHTML = data.bookmarks.map(article => `
            <div class="read-later-item" data-article-id="${article.article_id}">
                <div class="read-later-content">
                    <h4 class="read-later-title">${article.title || 'Untitled Article'}</h4>
                    <div class="read-later-meta">
                        <span class="read-later-sector">${article.sector || 'General'}</span>
                        <span class="read-later-date">Saved ${article.added_at ? new Date(article.added_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                </div>
                <div class="read-later-actions">
                    <button class="read-now-btn" onclick="openReadLaterArticle('${article.url || '#'}', event)">Read Now</button>
                    <button class="remove-btn" onclick="removeFromReadLater(${article.article_id}, event)">Remove</button>
                </div>
            </div>
        `).join('');

        // Open modal after loading content
        openModal('read-later-modal');

    } catch (error) {
        console.error('Failed to load read later articles:', error);
        readLaterList.innerHTML = '<div class="error">Failed to load saved articles. Please try again.</div>';
        // Still open modal to show error
        openModal('read-later-modal');
    }
}

// Open a saved article from the read-later modal
function openReadLaterArticle(url, event) {
    event.stopPropagation();
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        showNotification('Article link not available', 'error');
    }
}

// Remove article from read-later list
async function removeFromReadLater(articleId, event) {
    event.stopPropagation();

    const itemElement = event.target.closest('.read-later-item');
    if (!itemElement) return;

    // Optimistically remove from UI
    itemElement.style.opacity = '0.5';
    itemElement.style.pointerEvents = 'none';

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showNotification('Authentication session expired', 'error');
            // Revert optimistic update
            itemElement.style.opacity = '1';
            itemElement.style.pointerEvents = 'auto';
            return;
        }

        const response = await fetch('/api/user/read-later', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                article_id: articleId
            })
        });

        if (response.ok) {
            // Remove from UI
            itemElement.remove();

            // Check if list is empty now
            const readLaterList = document.getElementById('read-later-list');
            const remainingItems = readLaterList.querySelectorAll('.read-later-item');
            if (remainingItems.length === 0) {
                readLaterList.innerHTML = '<div class="empty-state">No saved articles yet. Click the book icon on articles to save them for later!</div>';
            }

            showNotification('Article removed from Read Later', 'success');

            // Update bookmark icons on main page
            updateBookmarkButtons();
        } else {
            const errorData = await response.json();
            showNotification(`Failed to remove article: ${errorData.error || 'Unknown error'}`, 'error');
            // Revert optimistic update
            itemElement.style.opacity = '1';
            itemElement.style.pointerEvents = 'auto';
        }
    } catch (error) {
        console.error('Error removing from read later:', error);
        showNotification('Failed to remove article. Please try again.', 'error');
        // Revert optimistic update
        itemElement.style.opacity = '1';
        itemElement.style.pointerEvents = 'auto';
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

// ===== CONTENT MANAGEMENT FUNCTIONS =====
function hideHomeContent() {
    // Hide daily summary, news tiles, and pagination
    const summarySection = document.getElementById('summary-section');
    const newsContainer = document.getElementById('news-container');
    const paginationContainer = document.getElementById('pagination-container');

    if (summarySection) summarySection.style.display = 'none';
    if (newsContainer) newsContainer.style.display = 'none';
    if (paginationContainer) paginationContainer.style.display = 'none';
}

function showHomeContent() {
    // Show daily summary, news tiles, and pagination
    const summarySection = document.getElementById('summary-section');
    const newsContainer = document.getElementById('news-container');
    const paginationContainer = document.getElementById('pagination-container');

    if (summarySection) summarySection.style.display = 'block';
    // Don't set display: block on news container - let loadNews() handle the grid layout
    if (newsContainer) {
        // Ensure grid layout is maintained
        newsContainer.style.display = 'grid';
        newsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        newsContainer.style.gap = '1.5rem';
    }
    if (paginationContainer) paginationContainer.style.display = 'none'; // Pagination is disabled
}

// ===== SEARCH INTERFACE FUNCTIONS =====
function showSearchInterface() {
    // Remove any existing search interface first
    const existingInterface = document.getElementById('search-interface');
    if (existingInterface) {
        existingInterface.remove();
    }

    // Create search interface to replace the hidden content - centered on the page
    const container = document.createElement('div');
    container.id = 'search-interface';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        padding: 2rem;
        width: 100%;
    `;

    container.innerHTML = `
        <div style="max-width: 600px; width: 100%; text-align: center;">
            <h2 style="color: #667eea; margin-bottom: 1rem; font-size: 2rem;">Search in ${currentMarket} Market</h2>
            <p style="color: #666; margin-bottom: 2rem; font-size: 1.1rem;">Find business news articles by title, content, or keywords in the ${currentMarket} market</p>

            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="margin-bottom: 1.5rem;">
                    <input type="text" id="search-input" placeholder="Search for articles in ${currentMarket}..."
                           style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; margin-bottom: 1rem;">
                    <button id="search-btn" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; width: 100%; transition: background-color 0.2s ease;">Search in ${currentMarket}</button>
                </div>
                <div id="search-results" style="text-align: left; max-height: 400px; overflow-y: auto;"></div>
            </div>

            <div style="margin-top: 2rem;">
                <button onclick="navigateToHome()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background-color 0.2s ease;">Back to Home</button>
            </div>
        </div>
    `;

    // Insert the search interface where the news content used to be
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && newsContainer.parentNode) {
        newsContainer.parentNode.insertBefore(container, newsContainer);
    }

    // Add search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        // Focus the input
        searchInput.focus();
    }

    // Re-initialize icons if needed
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const query = searchInput.value.trim();

    if (!query) {
        searchResults.innerHTML = '<p>Please enter a search term.</p>';
        return;
    }

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('user_logged_in') === 'true';
    if (!isLoggedIn) {
        searchResults.innerHTML = '<p>You need to be logged in to use the search functionality. <a href="#" onclick="closeAllModals(); showLoginModal(); return false;" style="color: #667eea;">Sign in here</a>.</p>';
        return;
    }

    searchResults.innerHTML = '<p>Searching...</p>';

    try {
        // Use authenticated search API with current market and user_id
        const response = fetch(`${API_BASE_URL}/api/search-similar?query=${encodeURIComponent(query)}&market=${currentMarket}&user_id=${currentUser.id}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        response.then(response => response.json())
        .then(data => {
            if (data.articles && data.articles.length > 0) {
                displaySearchResults(data.articles);
            } else {
                searchResults.innerHTML = '<p>No articles found matching your search.</p>';
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<p>Error performing search. Please try again.</p>';
    }
}

function displaySearchResults(articles) {
    const searchResults = document.getElementById('search-results');

    let html = '';
    articles.slice(0, 10).forEach(article => {
        const articleLink = article.link && article.link !== '#' && article.link.trim() !== '' ? article.link : null;
        const onclickHandler = articleLink ?
            `openPrimaryArticle('${articleLink.replace(/'/g, "\\'")}')` :
            `showNotification('Article link not available', 'error')`;

        html += `
            <div class="search-result-item" onclick="${onclickHandler}" style="${!articleLink ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                <div class="search-result-title">${article.title || 'No Title'}</div>
                <div class="search-result-meta">
                    ${article.source_system || 'Unknown Source'} •
                    ${article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Unknown Date'}
                    ${!articleLink ? ' • <span style=\"color: #dc3545;\">No Link</span>' : ''}
                </div>
            </div>
        `;
    });

    searchResults.innerHTML = html;
}

function closeSearchInterface() {
    // Remove search interface
    const searchInterface = document.getElementById('search-interface');
    if (searchInterface) {
        searchInterface.remove();
    }

    // Show home content
    showHomeContent();
}

// ===== USER PREFERENCES FUNCTIONS =====
async function loadUserPreferences() {
    try {
        // Only load if user is logged in and has user_id
        if (!currentUser || !currentUser.id) {
            console.log('No current user or user_id, cannot load preferences');
            // Return default empty preferences instead of undefined
            userPreferences = { read_later: [] };
            return userPreferences;
        }

        const response = await fetch(`${API_BASE_URL}/api/user/read-later`, {
            headers: {
                'Authorization': `Bearer ${currentUser.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('User preferences API returned error:', response.status, response.statusText);
            userPreferences = { read_later: [] };
            return userPreferences;
        }

        const data = await response.json();

        if (data.bookmarks && Array.isArray(data.bookmarks)) {
            // Store bookmarks for UI updates
            userPreferences = {
                read_later: data.bookmarks.map(b => ({
                    article_id: parseInt(b.article_id),
                    title: b.title,
                    added_at: b.added_at
                }))
            };
            console.log('Loaded user preferences:', userPreferences);
        } else {
            console.warn('Invalid bookmarks response format:', data);
            userPreferences = { read_later: [] };
        }
        return userPreferences;
    } catch (error) {
        console.error('Error loading user preferences:', error);
        userPreferences = { read_later: [] };
        return userPreferences;
    }
}

// ===== READ LATER FILTER FUNCTIONS =====
function toggleReadLaterFilter() {
    // Toggle between 'all' and 'read_later' modes
    filterMode = filterMode === 'all' ? 'read_later' : 'all';

    // Save the filter mode to localStorage
    localStorage.setItem('business_bites_filter_mode', filterMode);

    // Update navigation link styling
    updateFilterModeUI();

    if (filterMode === 'read_later') {
        // Show only saved articles
        showReadLaterArticles();
        showNotification('Showing Read Later articles only', 'info');
    } else {
        // Show all articles
        loadNews();
        showNotification('Showing all articles', 'info');
    }
}

function updateFilterModeUI() {
    const readLaterLink = document.querySelector('.nav-link[data-nav="read-later"]');
    if (readLaterLink) {
        if (filterMode === 'read_later') {
            readLaterLink.classList.add('active');
        } else {
            readLaterLink.classList.remove('active');
        }
    }
}

async function showReadLaterArticles() {
    // Close any open interfaces first
    closeAllInterfaces();

    // Hide home content and show read later view
    hideHomeContent();

    const newsContainer = document.getElementById('news-container');

    // Show loading state
    newsContainer.innerHTML = '<div class="loading">Loading your saved articles...</div>';

    try {
        // Check if user is logged in
        if (!currentUser) {
            newsContainer.innerHTML = `
                <div class="empty-state">
                    <p>You need to be logged in to view saved articles.</p>
                    <button onclick="showAuthModal()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">Sign In</button>
                </div>
            `;
            return;
        }

        // Get the JWT token - multiple fallback methods
        let token = null;

        // Method 1: Try getting from current session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            token = session.access_token;
        }

        // Method 2: If no token from session, try refresh and get again
        if (!token) {
            console.log('No token from session, trying to refresh...');
            const { data, error } = await supabase.auth.refreshSession();
            if (!error && data?.session?.access_token) {
                token = data.session.access_token;
            }
        }

        // Method 3: Try getting user and then session again
        if (!token) {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (user && !userError) {
                // Wait a moment and try session again
                await new Promise(resolve => setTimeout(resolve, 100));
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (retrySession?.access_token) {
                    token = retrySession.access_token;
                }
            }
        }

        // Method 4: Last resort - try to use the user's JWT if available
        if (!token && currentUser) {
            // Some Supabase versions store JWT in user object
            if (currentUser.access_token) {
                token = currentUser.access_token;
            }
        }

        if (!token) {
            console.warn('No access token available for Read Later - user may need to re-authenticate');
            newsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Authentication session expired. Please refresh the page and login again.</p>
                    <button onclick="location.reload()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">Refresh Page</button>
                </div>
            `;
            return;
        }

        console.log('Using access token for Read Later API call');

        // Get user's read later preferences using the token
        const response = await fetch('/api/user/read-later', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Read later API error:', response.status, response.statusText);
            newsContainer.innerHTML = `
                <div class="error">
                    Failed to load saved articles. Please try again.
                    <br><br>
                    <button onclick="navigateToHome()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">Browse Articles</button>
                </div>
            `;
            return;
        }

        const data = await response.json();

        if (!data.bookmarks || !Array.isArray(data.bookmarks) || data.bookmarks.length === 0) {
            newsContainer.innerHTML = `
                <div class="empty-state">
                    <p>You haven't saved any articles to read later yet.</p>
                    <p>Click the bookmark icon on any article to save it for later!</p>
                    <button onclick="navigateToHome()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">Browse Articles</button>
                </div>
            `;
            return;
        }

        console.log('Found saved articles:', data.bookmarks.length);

        // Update userPreferences with the loaded bookmarks
        userPreferences.read_later = data.bookmarks.map(b => ({
            article_id: parseInt(b.article_id),
            title: b.title,
            added_at: b.added_at
        }));

        // Load article details for each saved article
        const savedArticles = [];
        for (const item of userPreferences.read_later) {
            try {
                // Handle both old format (array of IDs) and new format (array of objects)
                const articleId = item.article_id;

                console.log('Loading article:', articleId);
                const response = await fetch(`${API_BASE_URL}/api/news/article/${articleId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.article) {
                        savedArticles.push(data.article);
                        console.log('Loaded article:', data.article.title);
                    } else {
                        console.warn('No article data for ID:', articleId);
                    }
                } else {
                    console.error(`Failed to load article ${articleId}:`, response.status, response.statusText);
                }
            } catch (error) {
                console.error(`Error loading article ${articleId}:`, error);
            }
        }

        if (savedArticles.length === 0) {
            newsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No saved articles could be loaded.</p>
                    <p>The articles you saved may have been removed or are temporarily unavailable.</p>
                    <button onclick="navigateToHome()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">Browse Articles</button>
                </div>
            `;
            return;
        }

        console.log('Displaying saved articles:', savedArticles.length);

        // Display the saved articles (displayNews expects an array directly)
        displayNews(savedArticles);

        // Completely disable pagination for Read Later view (no pagination needed for saved articles)
        const paginationContainer = document.getElementById('pagination-container');
        if (paginationContainer) {
            paginationContainer.innerHTML = ''; // Clear any existing pagination
            paginationContainer.style.display = 'none';
        }

        // Show content
        showHomeContent();

    } catch (error) {
        console.error('Error loading read later articles:', error);
        newsContainer.innerHTML = `
            <div class="error">
                Error loading saved articles. Please try again.
                <br><br>
                <button onclick="navigateToHome()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">Browse Articles</button>
            </div>
        `;
    }
}

// ===== WATCHLIST INTERFACE FUNCTIONS =====
function showWatchlistInterface(defaultTab = 'manage') {
    // Remove any existing watchlist interface first
    const existingInterface = document.getElementById('watchlist-interface');
    if (existingInterface) {
        existingInterface.remove();
    }

    // Hide home content first
    hideHomeContent();

    // Create unified watchlist interface with tabs (similar to User Assist)
    const container = document.createElement('div');
    container.id = 'watchlist-interface';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        min-height: 60vh;
        padding: 2rem;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
    `;

    // Determine which tab should be active by default
    const manageActive = defaultTab === 'manage' ? 'active' : '';
    const createActive = defaultTab === 'create' ? 'active' : '';
    const manageContentActive = defaultTab === 'manage' ? 'active' : '';
    const createContentActive = defaultTab === 'create' ? 'active' : '';

    container.innerHTML = `
        <div style="width: 100%; text-align: center; margin-bottom: 2rem;">
            <h2 style="color: #667eea; margin-bottom: 1rem; font-size: 2rem;">My Watchlists</h2>
            <p style="color: #666; margin-bottom: 2rem; font-size: 1.1rem;">Create and manage custom watchlists to track companies, sectors, and topics</p>
        </div>

        <div style="width: 100%; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Tab Navigation -->
            <div class="watchlist-tabs">
                <button class="watchlist-tab-btn ${manageActive}" data-tab="manage">Manage Watchlists</button>
                <button class="watchlist-tab-btn ${createActive}" data-tab="create">Create Watchlist</button>
            </div>

            <!-- Manage Watchlists Tab Content -->
            <div id="manage-watchlists-tab" class="tab-content ${manageContentActive}">
                <div class="watchlist-section">
                    <h4 style="margin-bottom: 1.5rem; color: #1f2937; font-size: 1.2rem; font-weight: 600;">Your Watchlists</h4>
                    <div id="watchlist-container" class="watchlist-container" style="width: 100%;"></div>
                </div>
            </div>

            <!-- Create Watchlist Tab Content -->
            <div id="create-watchlist-tab" class="tab-content ${createContentActive}">
                <div class="watchlist-section">
                    <h4 style="margin-bottom: 1.5rem; color: #1f2937; font-size: 1.2rem; font-weight: 600;">Create New Watchlist</h4>
                    <form id="create-watchlist-form" style="width: 100%;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">Watchlist Name *</label>
                                <input type="text" id="create-watchlist-name" placeholder="e.g., Tech Stocks, AI Companies" maxlength="50" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">Market</label>
                                <select id="create-watchlist-market" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                    <option value="US">🇺🇸 US</option>
                                    <option value="China">🇨🇳 China</option>
                                    <option value="EU">🇪🇺 EU</option>
                                    <option value="India">🇮🇳 India</option>
                                    <option value="Crypto">₿ Crypto</option>
                                </select>
                            </div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">Watchlist Type *</label>
                            <select id="create-watchlist-type" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                <option value="companies">Companies (e.g., Apple, Google, Tesla)</option>
                                <option value="sectors">Sectors (e.g., Technology, Healthcare)</option>
                                <option value="topics">Topics (e.g., AI, Blockchain, ESG)</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">Watchlist Items * <span style="font-weight: normal; color: #6b7280;">(start typing for suggestions)</span></label>
                            <div style="position: relative;">
                                <input type="text" id="create-watchlist-item-input" placeholder="Search for companies, sectors, or topics..." style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                <div id="watchlist-autocomplete-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; width: 100%; background: white; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-height: 200px; overflow-y: auto; z-index: 1000; display: none;"></div>
                            </div>
                            <div id="create-watchlist-items-preview" style="min-height: 60px; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; background-color: #f9fafb; display: flex; flex-wrap: wrap; gap: 0.5rem;"></div>
                        </div>
                        <button type="submit" class="submit-btn" style="width: 100%;">Create Watchlist</button>
                    </form>
                </div>
            </div>
        </div>

        <div style="margin-top: 2rem;">
            <button onclick="closeWatchlistInterface()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background-color 0.2s ease;">Back to Home</button>
        </div>
    `;

    // Insert the watchlist interface where the news content used to be
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && newsContainer.parentNode) {
        newsContainer.parentNode.insertBefore(container, newsContainer);
    }

    // Setup tab functionality
    setupWatchlistTabs();

    // Load existing watchlist data for the interface
    loadUserWatchlistsForInterface();

    // Re-initialize icons if needed
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}

function setupWatchlistTabs() {
    const tabBtns = document.querySelectorAll('.watchlist-tab-btn');

    // Function to setup form for active tab
    function setupActiveTab(tabType) {
        if (tabType === 'create') {
            setTimeout(() => {
                setupCreateWatchlistForm();
            }, 100);
        }
    }

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');

            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));

            // Show selected tab content
            const tabType = this.getAttribute('data-tab');
            const targetContent = document.getElementById(`${tabType}-watchlists-tab`) || document.getElementById(`${tabType}-watchlist-tab`);
            if (targetContent) {
                targetContent.classList.add('active');

                // Setup form functionality when create tab is activated
                setupActiveTab(tabType);
            }
        });
    });

    // Setup form for initially active tab
    const activeTab = document.querySelector('.watchlist-tab-btn.active');
    if (activeTab) {
        const activeTabType = activeTab.getAttribute('data-tab');
        setupActiveTab(activeTabType);
    }
}

function setupCreateWatchlistForm() {
    const form = document.getElementById('create-watchlist-form');
    const itemInput = document.getElementById('create-watchlist-item-input');
    const itemsPreview = document.getElementById('create-watchlist-items-preview');
    const autocompleteDropdown = document.getElementById('watchlist-autocomplete-dropdown');

    let watchlistItems = [];
    let autocompleteResults = [];
    let selectedResultIndex = -1;
    let autocompleteTimeout = null;

    // Function to update items preview
    function updateItemsPreview() {
        if (watchlistItems.length === 0) {
            itemsPreview.innerHTML = '<span style="color: #9ca3af; font-style: italic;">No items added yet</span>';
        } else {
            itemsPreview.innerHTML = watchlistItems.map((item, index) =>
                `<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; margin: 0.125rem; border-radius: 4px; font-size: 0.875rem;">
                    ${item}
                    <button onclick="removeWatchlistItem(${index})" style="margin-left: 0.25rem; background: none; border: none; color: #dc2626; cursor: pointer; font-weight: bold;">×</button>
                </span>`
            ).join('');
        }
    }

    // Make removeWatchlistItem available globally for onclick
    window.removeWatchlistItem = function(index) {
        watchlistItems.splice(index, 1);
        updateItemsPreview();
    };

    // Function to show autocomplete results or suggestions
    function showAutocompleteResults(results, query, suggestion = null) {
        if ((!results || results.length === 0) && !suggestion) {
            autocompleteDropdown.style.display = 'none';
            return;
        }

        let html = '';

        // Show matching results first
        if (results && results.length > 0) {
            results.forEach((result, index) => {
                const itemName = result.item_name;
                const itemType = result.item_type;
                const market = result.market;
                const marketCap = ''; // Removed rank display as requested
                const ticker = result.ticker_symbol ? ` (${result.ticker_symbol})` : '';

                // Highlight matching text
                const highlightedName = itemName.replace(new RegExp(`(${query})`, 'gi'), '<strong>$1</strong>');

                html += `
                    <div class="autocomplete-item" data-index="${index}" data-name="${itemName}" style="
                        padding: 0.5rem 0.75rem;
                        cursor: pointer;
                        border-bottom: 1px solid #f3f4f6;
                        transition: background-color 0.2s ease;
                        font-size: 0.9rem;
                        line-height: 1.4;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='white'">
                        <div style="font-weight: 500; color: #1f2937;">
                            ${highlightedName}${ticker ? ` (${ticker})` : ''} • ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} • ${market}
                        </div>
                    </div>
                `;
            });
        }

        // Show suggestion if no matches found
        if (suggestion) {
            html += `
                <div class="autocomplete-suggestion" style="
                    padding: 1rem;
                    background-color: #fef3c7;
                    border-top: ${results && results.length > 0 ? '1px solid #f3f4f6' : 'none'};
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                " onmouseover="this.style.backgroundColor='#fde68a'" onmouseout="this.style.backgroundColor='#fef3c7'">
                    <div style="font-weight: 500; color: #92400e; margin-bottom: 0.5rem;">${suggestion.message}</div>
                    <button onclick="submitFeatureRequest('${suggestion.item_name}', '${suggestion.type}')" style="
                        background-color: #f59e0b;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.875rem;
                        font-weight: 500;
                        transition: background-color 0.2s ease;
                    " onmouseover="this.style.backgroundColor='#d97706'" onmouseout="this.style.backgroundColor='#f59e0b'">
                        Submit Feature Request
                    </button>
                </div>
            `;
        }

        autocompleteDropdown.innerHTML = html;
        autocompleteDropdown.style.display = 'block';
        selectedResultIndex = -1;

        // Add click handlers for autocomplete items
        const autocompleteItems = autocompleteDropdown.querySelectorAll('.autocomplete-item');
        autocompleteItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                selectAutocompleteItem(results[index].item_name);
            });
        });
    }

    // Function to select autocomplete item
    function selectAutocompleteItem(itemName) {
        if (!watchlistItems.includes(itemName)) {
            watchlistItems.push(itemName);
            updateItemsPreview();
            console.log('✅ Item added via autocomplete:', itemName);
        } else {
            showNotification('Item already added to watchlist', 'error');
        }
        itemInput.value = '';
        autocompleteDropdown.style.display = 'none';
        itemInput.focus();
    }

    // Function to submit feature request for missing items
    function submitFeatureRequest(itemName, itemType) {
        console.log('📝 Submitting feature request for:', itemName, itemType);

        // Auto-submit feature request
        fetch(`${API_BASE_URL}/api/user-assist`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser ? 'Bearer ' + currentUser.access_token : ''}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser ? currentUser.id : 'demo-user',
                type: 'feature_request',
                title: `Add ${itemType}: ${itemName}`,
                description: `Please add "${itemName}" to the ${itemType} lookup table. This ${itemType.slice(0, -1)} is not currently available in the system.`
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`Feature request submitted for "${itemName}". We'll review it soon!`, 'success');
                autocompleteDropdown.style.display = 'none';
                itemInput.value = '';
            } else {
                showNotification('Failed to submit feature request', 'error');
            }
        })
        .catch(error => {
            console.error('Error submitting feature request:', error);
            showNotification('Failed to submit feature request', 'error');
        });
    }

    // Make submitFeatureRequest available globally
    window.submitFeatureRequest = submitFeatureRequest;

    // Function to fetch autocomplete suggestions
    async function fetchAutocompleteSuggestions(query, market, type) {
        if (!query || query.length < 2) {
            autocompleteDropdown.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/watchlists/lookup?query=${encodeURIComponent(query)}&market=${market}&type=${type}&limit=8`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Combine all results into a single array
                const allResults = [
                    ...(data.results.companies || []).map(item => ({ ...item, item_type: 'companies' })),
                    ...(data.results.sectors || []).map(item => ({ ...item, item_type: 'sectors' })),
                    ...(data.results.topics || []).map(item => ({ ...item, item_type: 'topics' }))
                ];

                autocompleteResults = allResults;
                showAutocompleteResults(allResults, query, data.suggestion);
            } else {
                autocompleteDropdown.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching autocomplete suggestions:', error);
            autocompleteDropdown.style.display = 'none';
        }
    }

    // Handle item input with autocomplete
    if (itemInput) {
        itemInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const market = document.getElementById('create-watchlist-market')?.value || 'US';
            const type = document.getElementById('create-watchlist-type')?.value || 'companies';

            // Clear previous timeout
            if (autocompleteTimeout) {
                clearTimeout(autocompleteTimeout);
            }

            // Hide dropdown if input is empty
            if (!query) {
                autocompleteDropdown.style.display = 'none';
                return;
            }

            // Debounce autocomplete requests
            autocompleteTimeout = setTimeout(() => {
                fetchAutocompleteSuggestions(query, market, type);
            }, 300);
        });

        // Handle keyboard navigation
        itemInput.addEventListener('keydown', (e) => {
            if (autocompleteDropdown.style.display === 'none') return;

            const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedResultIndex = Math.min(selectedResultIndex + 1, items.length - 1);
                updateSelectedItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
                updateSelectedItem(items);
            } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
                e.preventDefault();
                const selectedItem = autocompleteResults[selectedResultIndex];
                if (selectedItem) {
                    selectAutocompleteItem(selectedItem.item_name);
                }
            } else if (e.key === 'Escape') {
                autocompleteDropdown.style.display = 'none';
                selectedResultIndex = -1;
            }
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!itemInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
                autocompleteDropdown.style.display = 'none';
                selectedResultIndex = -1;
            }
        });

        // Prevent manual input - only allow selection from dropdown
        itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // If no item is selected and there are no matches, show message
                if (selectedResultIndex === -1 && autocompleteResults.length === 0) {
                    showNotification('Please select an item from the dropdown or submit a feature request', 'info');
                }
            }
        });
    }

    // Function to update selected item styling
    function updateSelectedItem(items) {
        items.forEach((item, index) => {
            if (index === selectedResultIndex) {
                item.style.backgroundColor = '#dbeafe';
            } else {
                item.style.backgroundColor = 'white';
            }
        });
    }

    // Handle form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('create-watchlist-name');
            const typeSelect = document.getElementById('create-watchlist-type');
            const marketSelect = document.getElementById('create-watchlist-market');

            const name = nameInput ? nameInput.value.trim() : '';
            const type = typeSelect ? typeSelect.value : 'companies';
            const market = marketSelect ? marketSelect.value : 'US';

            // Validation
            if (!name) {
                showNotification('Please enter a watchlist name', 'error');
                return;
            }

            if (watchlistItems.length === 0) {
                showNotification('Please add at least one item to your watchlist', 'error');
                return;
            }

            if (!currentUser || !currentUser.id) {
                showNotification('You must be logged in to create watchlists', 'error');
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating...';
            submitBtn.disabled = true;

            try {
                // Get the JWT token using Supabase auth methods
                let token = null;
                let authError = null;

                try {
                    // Try to get the current session first
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        token = session.access_token;
                        console.log('Got token from current session');
                    } else if (sessionError) {
                        authError = sessionError;
                        console.warn('Session error:', sessionError);
                    }
                } catch (sessionErr) {
                    console.warn('Error getting session:', sessionErr);
                }

                // If no token from session, try refresh
                if (!token) {
                    try {
                        console.log('No token from session, trying to refresh...');
                        const { data, error } = await supabase.auth.refreshSession();
                        if (!error && data?.session?.access_token) {
                            token = data.session.access_token;
                            console.log('Got token from refresh session');
                        } else if (error) {
                            authError = error;
                            console.warn('Refresh session error:', error);
                        }
                    } catch (refreshErr) {
                        console.warn('Error refreshing session:', refreshErr);
                    }
                }

                // If still no token, try to get user (this might trigger re-auth)
                if (!token) {
                    try {
                        const { data: { user }, error: userError } = await supabase.auth.getUser();
                        if (user && !userError) {
                            // Try session again after user auth
                            const { data: { session: userSession } } = await supabase.auth.getSession();
                            if (userSession?.access_token) {
                                token = userSession.access_token;
                                console.log('Got token after user auth check');
                            }
                        } else if (userError) {
                            authError = userError;
                            console.warn('User auth error:', userError);
                        }
                    } catch (userErr) {
                        console.warn('Error getting user:', userErr);
                    }
                }

                if (!token) {
                    console.error('All token retrieval methods failed:', authError);
                    showNotification('Authentication failed. Please refresh the page and login again.', 'error');
                    return;
                }

                console.log('Creating watchlist with token:', token.substring(0, 20) + '...');

                const response = await fetch(`${API_BASE_URL}/api/watchlists`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        type,
                        market,
                        items: watchlistItems
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showNotification('Watchlist created successfully!', 'success');
                    // Clear form
                    form.reset();
                    // Reset items preview
                    updateItemsPreview();
                    watchlistItems = [];
                    // Switch to manage tab to show the new watchlist
                    const manageTab = document.querySelector('.watchlist-tab-btn[data-tab="manage"]');
                    if (manageTab) {
                        manageTab.click();
                    }
                    // Refresh watchlists display
                    loadUserWatchlistsForInterface();
                } else {
                    showNotification(`Failed to create watchlist: ${data.error || 'Unknown error'}`, 'error');
                }

            } catch (error) {
                console.error('Error creating watchlist:', error);
                showNotification('Failed to create watchlist: ' + error.message, 'error');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Initialize preview
    updateItemsPreview();
}

function closeWatchlistInterface() {
    // Remove watchlist interface
    const watchlistInterface = document.getElementById('watchlist-interface');
    if (watchlistInterface) {
        watchlistInterface.remove();
    }

    // Show home content
    showHomeContent();
}

// ===== USER ASSIST INTERFACE FUNCTIONS =====
function showUserAssistInterface() {
    // Remove any existing user assist interface first
    const existingInterface = document.getElementById('user-assist-interface');
    if (existingInterface) {
        existingInterface.remove();
    }

    // Create user assist interface to replace the hidden content
    const container = document.createElement('div');
    container.id = 'user-assist-interface';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        min-height: 60vh;
        padding: 2rem;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
    `;

    container.innerHTML = `
        <div style="width: 100%; text-align: center; margin-bottom: 2rem;">
            <h2 style="color: #667eea; margin-bottom: 1rem; font-size: 2rem;">User Assist</h2>
            <p style="color: #666; margin-bottom: 2rem; font-size: 1.1rem;">Report bugs or request features to help improve Business Bites</p>
        </div>

        <div style="width: 100%; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Tab Navigation -->
            <div class="user-assist-tabs">
                <button class="tab-btn active" data-tab="bug-reports">Bug Reports</button>
                <button class="tab-btn" data-tab="feature-requests">Feature Requests</button>
            </div>

            <div class="modal-body">
                <!-- Upper Section: Submit Form -->
                <div class="submit-section">
                    <h4 id="submit-section-title">Report Bug</h4>
                    <form id="user-assist-form">
                        <input type="text" id="issue-title" placeholder="Issue Title" maxlength="100" required>
                        <textarea id="issue-description" placeholder="Describe the issue..." maxlength="500" required></textarea>
                        <button type="submit" class="submit-btn">Submit Issue</button>
                    </form>
                </div>

                <!-- Lower Section: History View -->
                <div class="history-section">
                    <h4>Your Submissions</h4>
                    <div class="status-filters">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="pending">Pending</button>
                        <button class="filter-btn" data-filter="resolved">Resolved</button>
                        <button class="filter-btn" data-filter="closed">Closed</button>
                    </div>
                    <div id="submissions-list" class="submissions-list">
                        <div class="loading">Loading your submissions...</div>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top: 2rem;">
            <button onclick="navigateToHome()" style="background-color: #667eea; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background-color 0.2s ease;">Back to Home</button>
        </div>
    `;

    // Insert the user assist interface where the news content used to be
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && newsContainer.parentNode) {
        newsContainer.parentNode.insertBefore(container, newsContainer);
    }

    // Setup user assist functionality AFTER the interface is created
    setTimeout(() => {
        setupUserAssistModal();
        loadUserAssistSubmissions();
    }, 100);

    // Re-initialize icons if needed
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}

function setupUserAssistModal() {
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('#user-assist-interface .tab-btn');
    tabBtns.forEach((btn) => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');

            // Update form title
            const tabType = this.getAttribute('data-tab');
            const titleElement = document.getElementById('submit-section-title');
            if (titleElement) {
                titleElement.textContent = tabType === 'bug-reports' ? 'Report Bug' : 'Request Feature';
            }
        });
    });

    // Form submission
    const form = document.getElementById('user-assist-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const title = form.querySelector('#issue-title').value.trim();
            const description = form.querySelector('#issue-description').value.trim();
            const activeTab = document.querySelector('#user-assist-interface .tab-btn.active');
            const type = activeTab ? activeTab.getAttribute('data-tab') : 'bug-reports';

            // Map tab types to API types
            const apiType = type === 'bug-reports' ? 'bug_report' : 'feature_request';

            if (!title || !description) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            if (!currentUser || !currentUser.id) {
                showNotification('You must be logged in to submit feedback', 'error');
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            try {
                // Get the JWT token using the same method as other API calls
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    showNotification('Authentication session expired. Please login again.', 'error');
                    return;
                }

                const token = session.access_token;
                console.log('Submitting User Assist feedback with token:', token.substring(0, 20) + '...');

                const response = await fetch(`${API_BASE_URL}/api/user-assist`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        type: apiType,
                        title: title,
                        description: description
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showNotification('Feedback submitted successfully!', 'success');
                    // Clear form
                    form.reset();
                    // Reload submissions
                    loadUserAssistSubmissions();
                } else {
                    showNotification(`Failed to submit feedback: ${data.error || 'Unknown error'}`, 'error');
                }

            } catch (error) {
                console.error('Error submitting feedback:', error);
                showNotification('Failed to submit feedback: ' + error.message, 'error');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Status filter functionality
    const filterBtns = document.querySelectorAll('#user-assist-interface .filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all filters
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked filter
            this.classList.add('active');

            // Filter submissions
            const filterType = this.getAttribute('data-filter');
            filterUserAssistSubmissions(filterType);
        });
    });
}

function filterUserAssistSubmissions(filterType) {
    const submissionItems = document.querySelectorAll('#user-assist-interface .submission-item');

    submissionItems.forEach(item => {
        const statusElement = item.querySelector('.submission-status');
        if (!statusElement) return;

        const status = statusElement.textContent.toLowerCase();

        if (filterType === 'all' ||
            (filterType === 'pending' && status === 'pending') ||
            (filterType === 'resolved' && status === 'resolved') ||
            (filterType === 'closed' && status === 'closed')) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function closeUserAssistInterface() {
    // Remove user assist interface
    const userAssistInterface = document.getElementById('user-assist-interface');
    if (userAssistInterface) {
        userAssistInterface.remove();
    }

    // Show home content
    showHomeContent();
}

// ===== WATCHLIST SUBMENU FUNCTIONS =====
function toggleWatchlistSubmenu(event) {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    const submenu = document.getElementById('watchlist-submenus');

    if (!submenu) return;

    // Toggle submenu visibility
    const isVisible = submenu.style.opacity === '1' || submenu.style.visibility === 'visible';

    if (isVisible) {
        // Hide submenu
        submenu.style.opacity = '0';
        submenu.style.visibility = 'hidden';
        submenu.style.transform = 'translateX(-10px)';
    } else {
        // Show submenu
        submenu.style.opacity = '1';
        submenu.style.visibility = 'visible';
        submenu.style.transform = 'translateX(0)';
    }
}

// Load watchlist submenus on hover - matching local site behavior
async function loadWatchlistSubmenus() {
    console.log('🎯 loadWatchlistSubmenus called');

    // Check if user is logged in
    if (!currentUser || !currentUser.id) {
        console.log('👤 No user logged in, cannot load watchlist submenus');
        // Show create option only
        const submenu = document.getElementById('watchlist-submenus');
        if (submenu) {
            submenu.innerHTML = '<li class="watchlist-submenu-item"><a href="#" onclick="showWatchlistInterface()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';
        }
        return;
    }

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            console.warn('No access token available for watchlist submenus');
            return;
        }

        console.log('🌐 Fetching watchlists for submenu population');

        // Call the watchlists API - it expects JWT token for user identification
        const response = await fetch(`${API_BASE_URL}/api/watchlists`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Watchlists loaded for submenu:', data.watchlists.length, 'watchlists');

            // Update navigation panel class for hover expansion
            const navPanel = document.getElementById('nav-panel');
            if (navPanel) {
                if (data.watchlists && data.watchlists.length > 0) {
                    navPanel.classList.add('watchlist-expanded');
                    console.log('✅ Added watchlist-expanded class to nav panel');
                } else {
                    navPanel.classList.remove('watchlist-expanded');
                }
            }

            // Populate submenu
            populateWatchlistSubmenus(data.watchlists);
        } else {
            console.error('❌ Failed to load watchlists for submenu:', data.error);
            // Show create option only
            const submenu = document.getElementById('watchlist-submenus');
            if (submenu) {
                submenu.innerHTML = '<li class="watchlist-submenu-item"><a href="#" onclick="showWatchlistInterface()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';
            }
        }
    } catch (error) {
        console.error('❌ Error loading watchlist data for submenus:', error);
        // Show create option only
        const submenu = document.getElementById('watchlist-submenus');
        if (submenu) {
            submenu.innerHTML = '<li class="watchlist-submenu-item"><a href="#" onclick="showWatchlistInterface()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';
        }
    }
}

// Load watchlist data for navigation submenus
async function loadWatchlistDataForSubmenus() {
    console.log('🔧 loadWatchlistDataForSubmenus called');

    // Check if user is logged in
    if (!currentUser || !currentUser.id) {
        console.log('👤 No user logged in, cannot load watchlist submenus');
        // Show create option only
        const submenu = document.getElementById('watchlist-submenus');
        if (submenu) {
            submenu.innerHTML = '<li class="watchlist-submenu-item"><a href="#" onclick="openCreateWatchlistModal()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';
        }
        return;
    }

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            console.warn('No access token available for watchlist submenus');
            return;
        }

        console.log('🌐 Fetching watchlists for submenu population');

        // Call the watchlists API - it expects JWT token for user identification
        const response = await fetch(`${API_BASE_URL}/api/watchlists`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Watchlists loaded for submenu:', data.watchlists.length, 'watchlists');

            // Update navigation panel class for hover expansion
            const navPanel = document.getElementById('nav-panel');
            if (navPanel) {
                if (data.watchlists && data.watchlists.length > 0) {
                    navPanel.classList.add('watchlist-expanded');
                    console.log('✅ Added watchlist-expanded class to nav panel');
                } else {
                    navPanel.classList.remove('watchlist-expanded');
                }
            }

            // Populate submenu
            populateWatchlistSubmenus(data.watchlists);
        } else {
            console.error('❌ Failed to load watchlists for submenu:', data.error);
            // Show create option only
            const submenu = document.getElementById('watchlist-submenus');
            if (submenu) {
                submenu.innerHTML = '<li class="watchlist-submenu-item"><a href="#" onclick="openCreateWatchlistModal()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';
            }
        }
    } catch (error) {
        console.error('❌ Error loading watchlist data for submenus:', error);
        // Show create option only
        const submenu = document.getElementById('watchlist-submenus');
        if (submenu) {
            submenu.innerHTML = '<li class="watchlist-submenu-item"><a href="#" onclick="openCreateWatchlistModal()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';
        }
    }
}

// Populate watchlist submenus in navigation
function populateWatchlistSubmenus(watchlists) {
    console.log('🎯 populateWatchlistSubmenus called with:', watchlists, 'current market:', currentMarket);

    const submenu = document.getElementById('watchlist-submenus');

    if (!submenu) {
        console.error('❌ Watchlist submenu element not found');
        return;
    }

    // Filter watchlists by current market selection
    let filteredWatchlists = watchlists;
    if (currentMarket && currentMarket !== '') {
        filteredWatchlists = watchlists.filter(watchlist => {
            const watchlistMarket = watchlist.market || 'US'; // Default to US if no market specified
            return watchlistMarket === currentMarket;
        });
        console.log(`📊 Filtered watchlists for market "${currentMarket}": ${filteredWatchlists.length} out of ${watchlists.length}`);
    }

    // Build submenu HTML
    let submenuHtml = '';

    // Add existing watchlists as filter options (filtered by current market)
    if (filteredWatchlists && filteredWatchlists.length > 0) {
        filteredWatchlists.forEach((watchlist, index) => {
            const watchlistId = watchlist.id || watchlist.watchlist_id;
            const watchlistName = watchlist.name || watchlist.watchlist_name || 'Unnamed Watchlist';
            const watchlistMarket = watchlist.market || 'US';
            const itemCount = watchlist.items ? watchlist.items.length : 0;

            console.log(`📋 Watchlist ${index}: ${watchlistName} (${watchlistMarket}, ${itemCount} items)`);

            submenuHtml += `
                <li class="watchlist-submenu-item">
                    <a href="#" onclick="filterByWatchlist('${watchlistId}')" class="watchlist-submenu-link">
                        <span class="watchlist-name">${watchlistName}</span>
                        <span class="watchlist-market">(${watchlistMarket})</span>
                    </a>
                </li>
            `;
        });
    }
    // If no watchlists for current market, don't show anything (empty submenu)

    // Always add "+ Create New Watchlist" option
    submenuHtml += '<li class="watchlist-submenu-item"><a href="#" onclick="showWatchlistInterface()" class="watchlist-submenu-link create-link">+ Create New Watchlist</a></li>';

    submenu.innerHTML = submenuHtml;
    console.log(`✅ Watchlist submenu populated with ${filteredWatchlists ? filteredWatchlists.length : 0} watchlists for market "${currentMarket}" + create option`);
}

// Filter news by watchlist
async function filterByWatchlist(watchlistId) {
    console.log('🔍 filterByWatchlist called with ID:', watchlistId);

    if (!currentUser || !currentUser.id) {
        console.log('👤 User not authenticated, showing login modal');
        showAuthModal();
        return;
    }

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            console.warn('No access token available for watchlist filtering');
            showAuthModal();
            return;
        }

        console.log('🌐 Fetching watchlist news for watchlist:', watchlistId);

        // Call the watchlist filter API
        const response = await fetch(`${API_BASE_URL}/api/watchlists/filter-news?id=${watchlistId}&market=${currentMarket}&page=1`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Watchlist filter API success:', data);
            console.log('📊 Articles count:', data.articles ? data.articles.length : 0);
            console.log('📋 Watchlist data:', data.watchlist);

            // Close any open interfaces and hide home content
            closeAllInterfaces();
            hideHomeContent();

            // Display watchlist interface with header and filtering
            displayWatchlistNewsInterface(data.watchlist, data.articles, data.articles_count);

            showNotification(`Showing articles from "${data.watchlist.name}" watchlist`, 'success');
        } else {
            console.error('❌ Watchlist filter API returned error:', data.error);
            showNotification(`Failed to load watchlist articles: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error filtering news by watchlist:', error);
        showNotification('Failed to load watchlist articles. Please try again.', 'error');
    }
}

// Display watchlist news interface with header and filtering
function displayWatchlistNewsInterface(watchlist, articles, totalArticles) {
    console.log('🎯 displayWatchlistNewsInterface called with watchlist:', watchlist, 'articles:', articles.length, 'total:', totalArticles);

    const watchlistName = watchlist.name || watchlist.watchlist_name || 'Unnamed Watchlist';
    const market = watchlist.market || currentMarket || 'US';
    const watchlistItems = watchlist.items || [];

    // Create watchlist header with name/market and controls
    const summaryContainer = document.getElementById('summary-section');
    if (summaryContainer) {
        // Make summary section visible (it was hidden by hideHomeContent)
        summaryContainer.style.display = 'block';
        summaryContainer.style.visibility = 'visible';

        let html = `<div class="summary-section">`;

        // Enhanced watchlist header with name|market|type on left, articles + dropdown on right
        html += `
            <nav class="market-nav" style="margin-bottom: 2rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; font-size: 0.9rem; font-weight: 500; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="color: #667eea; font-weight: 600;">${watchlistName}|${market}|${watchlist.type}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="color: #059669; font-weight: 500;">Articles: ${totalArticles}</span>
                        <select id="watchlist-item-filter" style="padding: 0.25rem 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.8rem;">
                            <option value="all">All</option>
                            ${watchlistItems.map(item =>
                                `<option value="${item}">${item}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </nav>
        `;

        html += `</div>`;
        summaryContainer.innerHTML = html;

        // Add event listener for item filter dropdown
        const itemFilter = document.getElementById('watchlist-item-filter');
        if (itemFilter) {
            itemFilter.addEventListener('change', function() {
                const selectedItem = this.value;
                filterWatchlistArticlesByItem(selectedItem, articles, watchlist);
            });
        }

        console.log('✅ Summary section made visible and populated');
    } else {
        console.error('❌ Summary container not found');
    }

    // Display articles in compact tiles (no read later, no source links)
    displayWatchlistArticles(articles);

    console.log('✅ Watchlist news interface displayed');
}

// Display watchlist articles in compact format
function displayWatchlistArticles(articles) {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;

    // Set grid layout for compact tiles
    newsContainer.style.display = 'grid';
    newsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
    newsContainer.style.gap = '1rem';

    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = '<div class="empty-state"><p>No articles found for this watchlist. The items in your watchlist may not have matching news articles yet.</p></div>';
        return;
    }

    newsContainer.innerHTML = '';

    articles.forEach(article => {
        const articleElement = createWatchlistArticleElement(article);
        newsContainer.appendChild(articleElement);
    });

    // Re-initialize Lucide icons
    refreshLucideIcons();
}

// Create compact article element for watchlist (no read later, no source links)
function createWatchlistArticleElement(article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'news-card-link';

    const articleCard = document.createElement('div');
    articleCard.className = 'news-card watchlist-card';
    articleCard.onclick = () => openPrimaryArticle(article.link || '#');

    // Handle external images through proxy to avoid CORS issues in Vercel
    let imageUrl;

    if (article.thumbnail_url) {
        imageUrl = getProxiedImageUrl(article.thumbnail_url);
    } else if (article.urlToImage) {
        imageUrl = getProxiedImageUrl(article.urlToImage);
    } else if (article.enhanced_metadata && article.enhanced_metadata.thumbnail_url) {
        imageUrl = getProxiedImageUrl(article.enhanced_metadata.thumbnail_url);
    } else {
        // Generate unique SVG placeholder based on article ID and title
        imageUrl = generateUniquePlaceholder(article.id, article.title || 'Article');
    }

    const impactColor = getImpactColor(article.impact_score);
    const sentimentColor = getSentimentColor(article.sentiment);

    // Get source and author from article fields
    const newsSource = article.source_system || article.source || 'Unknown';
    const newsAuthor = article.author || '';

    articleCard.innerHTML = `
        <!-- Image on top (smaller for compact view) -->
        <div class="news-image-container watchlist-image-container">
            <img src="${imageUrl}" alt="${article.title}" class="news-image" onerror="handleImageError(this)">
        </div>

        <!-- Content below image -->
        <div class="news-text-content watchlist-text-content">
            <h4 class="news-title watchlist-title">${article.title || 'No Title Available'}</h4>
            <div class="news-summary watchlist-summary">
                ${article.summary ? article.summary.substring(0, 120) + (article.summary.length > 120 ? '...' : '') : 'No summary available.'}
            </div>
        </div>

        <!-- Compact meta info -->
        <div class="news-meta-compact">
            <span class="meta-sector">${article.sector || 'General'}</span>
            <span class="meta-separator">•</span>
            <span class="meta-source">${newsSource}</span>
        </div>

        <!-- Date and impact -->
        <div class="news-published-compact">
            <span class="published-date">${article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</span>
            <span class="meta-separator">•</span>
            <span class="impact-score">Impact:${article.impact_score || ''}</span>
        </div>
    `;

    articleDiv.appendChild(articleCard);
    return articleDiv;
}

// Filter watchlist articles by selected item
function filterWatchlistArticlesByItem(selectedItem, allArticles, watchlist) {
    console.log('🔍 Filtering articles by item:', selectedItem);
    console.log('📊 Total articles before filtering:', allArticles.length);

    let filteredArticles = allArticles;

    if (selectedItem !== 'all') {
        // For company watchlists, use flexible matching since names might not match exactly
        // For sector/topic watchlists, filter by sector field
        const watchlistType = watchlist.type || watchlist.watchlist_category;

        if (watchlistType === 'companies') {
            // For companies, use very flexible matching - check multiple fields and variations
            filteredArticles = allArticles.filter(article => {
                const selectedLower = selectedItem.toLowerCase();
                const companyName = (article.company_name || '').toLowerCase();
                const title = (article.title || '').toLowerCase();
                const summary = (article.summary || '').toLowerCase();
                const source = (article.source_system || '').toLowerCase();

                // Debug logging for first few articles
                if (filteredArticles.length === 0 && allArticles.indexOf(article) < 3) {
                    console.log(`🔍 Checking article "${title.substring(0, 50)}..."`);
                    console.log(`   company_name: "${companyName}"`);
                    console.log(`   selected: "${selectedLower}"`);
                }

                // Extract common name variations from selected item
                const selectedWords = selectedLower.split(/[\s.,]+/).filter(word => word.length > 2);
                const companyWords = companyName.split(/[\s.,]+/).filter(word => word.length > 2);

                // Check if any significant words match between selected item and company name
                const hasWordMatch = selectedWords.some(selectedWord =>
                    companyWords.some(companyWord =>
                        selectedWord.includes(companyWord) || companyWord.includes(selectedWord)
                    )
                );

                // Try various matching strategies
                const matches = [
                    // Exact match
                    companyName === selectedLower,
                    // Selected item contains company name (e.g., "Alphabet Inc." contains "Alphabet")
                    selectedLower.includes(companyName) && companyName.length > 2,
                    // Company name contains selected item (reverse)
                    companyName.includes(selectedLower) && selectedLower.length > 2,
                    // Word-based matching (e.g., "Amazon" in "Amazon.com Inc.")
                    hasWordMatch,
                    // Title contains the selected item
                    title.includes(selectedLower.split('.')[0]), // Remove .com, .inc etc.
                    // Summary contains the selected item
                    summary.includes(selectedLower.split('.')[0]),
                    // Source contains company name
                    source.includes(companyName) && companyName.length > 2
                ];

                const isMatch = matches.some(match => match === true);

                if (isMatch && filteredArticles.length === 0) {
                    console.log(`✅ Match found for "${selectedItem}" in article: "${title.substring(0, 50)}..."`);
                }

                return isMatch;
            });
        } else {
            // For sectors/topics, filter by sector field
            filteredArticles = allArticles.filter(article => {
                const sectorMatch = article.sector === selectedItem;
                const titleMatch = (article.title || '').toLowerCase().includes(selectedItem.toLowerCase());
                return sectorMatch || titleMatch;
            });
        }

        console.log(`✅ Filtered to ${filteredArticles.length} articles matching "${selectedItem}" for ${watchlistType}`);
    } else {
        console.log(`✅ Showing all ${allArticles.length} articles`);
    }

    // Update article count display
    const totalArticlesSpan = document.querySelector('.market-nav .summary-section .summary-section span:nth-child(3)');
    if (totalArticlesSpan) {
        totalArticlesSpan.textContent = `Articles: ${filteredArticles.length}`;
    }

    // Display filtered articles
    displayWatchlistArticles(filteredArticles);
}

// Display watchlist filter summary
function displayWatchlistFilterSummary(watchlist, totalArticleCount = null) {
    console.log('🏷️ displayWatchlistFilterSummary called with watchlist:', watchlist, 'totalArticleCount:', totalArticleCount);

    const container = document.getElementById('summary-section');

    const watchlistName = watchlist.name || watchlist.watchlist_name || 'Unnamed Watchlist';
    const market = watchlist.market || currentMarket || 'US';
    const itemCount = watchlist.items ? watchlist.items.length : 0;

    // Use provided total count, or fall back to counting displayed articles
    let displayArticleCount;
    if (totalArticleCount !== null) {
        displayArticleCount = totalArticleCount;
        console.log('📊 Using provided total article count:', totalArticleCount);
    } else {
        // Get current article count from the news container
        const newsContainer = document.getElementById('news-container');
        const articleElements = newsContainer ? newsContainer.querySelectorAll('.news-card-link') : [];
        displayArticleCount = articleElements.length;
        console.log('📊 Using displayed article count (fallback):', displayArticleCount);
    }

    console.log('📊 Watchlist summary - Name:', watchlistName, 'Market:', market, 'Type:', watchlist.type, 'Item count:', itemCount, 'Display article count:', displayArticleCount);

    let html = `<div class="summary-section">`;

    // Watchlist Filter Summary
    html += `
        <nav class="market-nav" style="margin-bottom: 2rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; font-size: 0.9rem; font-weight: 500; min-width: max-content;">
                <span style="color: #667eea; font-weight: 600;">${watchlistName}|${market}</span>
                <span style="color: #d1d5db;">|</span>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <span style="color: #059669; font-weight: 500;">Articles: ${displayArticleCount}</span>
                    <span style="color: #d1d5db;">|</span>
                    <button onclick="navigateToHome()" style="background: #dc2626; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Clear Filter</button>
                </div>
            </div>
        </nav>
    `;

    html += `</div>`;
    container.innerHTML = html;

    console.log('✅ Watchlist filter summary updated with display article count:', displayArticleCount);
}

// ===== NAVIGATION FUNCTIONS =====
function navigateToHome() {
    // Close any open interfaces
    closeAllInterfaces();

    // Reset filter mode to 'all'
    if (filterMode !== 'all') {
        filterMode = 'all';
        localStorage.setItem('business_bites_filter_mode', filterMode);
        updateFilterModeUI();
    }

    // Reset to default state
    currentMarket = 'US';
    currentSector = '';
    currentSearch = '';
    currentPage = 1;

    // Update market tabs
    updateMarketTabs();

    // Load user bookmarks if logged in (to show bookmark state)
    if (currentUser && currentUser.id) {
        loadUserBookmarks().then(() => {
            // Reload news after bookmarks are loaded
            loadNews();
        }).catch(() => {
            // Even if bookmarks fail, still load news
            loadNews();
        });
    } else {
        // Reload news to show all articles in proper grid layout
        loadNews();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close all open interfaces
function closeAllInterfaces() {
    closeSearchInterface();
    closeWatchlistInterface();
    closeUserAssistInterface();

    // Also hide summary section when closing all interfaces
    const summarySection = document.getElementById('summary-section');
    if (summarySection) {
        summarySection.style.display = 'none';
    }
}

// ===== USER ASSIST FUNCTIONS =====
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
        showAuthModal();
        return;
    }

    const title = document.getElementById('issue-title').value;
    const description = document.getElementById('issue-description').value;
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    const issueType = activeTab === 'bug-reports' ? 'bug_report' : 'feature_request';

            try {
                // Get the JWT token - multiple fallback methods
                let token = null;

                // Method 1: Try getting from current session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    token = session.access_token;
                }

                // Method 2: If no token from session, try refresh and get again
                if (!token) {
                    console.log('No token from session, trying to refresh...');
                    const { data, error } = await supabase.auth.refreshSession();
                    if (!error && data?.session?.access_token) {
                        token = data.session.access_token;
                    }
                }

                // Method 3: Try getting user and then session again
                if (!token) {
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (user && !userError) {
                        // Wait a moment and try session again
                        await new Promise(resolve => setTimeout(resolve, 100));
                        const { data: { session: retrySession } } = await supabase.auth.getSession();
                        if (retrySession?.access_token) {
                            token = retrySession.access_token;
                        }
                    }
                }

                // Method 4: Last resort - try to use the user's JWT if available
                if (!token && currentUser) {
                    // Some Supabase versions store JWT in user object
                    if (currentUser.access_token) {
                        token = currentUser.access_token;
                    }
                }

                if (!token) {
                    console.warn('No access token available for User Assist submission - user may need to re-authenticate');
                    showNotification('Authentication session expired. Please refresh the page and login again.', 'error');
                    return;
                }

                console.log('Using access token for User Assist submission');

                const response = fetch(`${API_BASE_URL}/api/user-assist`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: apiType,
                        title: title,
                        description: description
                    })
                });

        const data = await response.json();

        if (response.ok) {
            showNotification('Feedback submitted successfully!', 'success');
            e.target.reset();
            // Refresh submissions list
            loadUserAssistSubmissions();
        } else {
            showNotification(`Failed to submit feedback: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showNotification('Failed to submit feedback. Please try again.', 'error');
    }
}

async function loadUserAssistSubmissions() {
    console.log('🔍 loadUserAssistSubmissions called');
    console.log('Current user:', currentUser);

    if (!currentUser) {
        console.log('❌ No current user, returning early');
        return;
    }

    try {
        console.log('🔍 Getting session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('❌ Session error:', sessionError);
            showNotification('Authentication session error. Please refresh and login again.', 'error');
            return;
        }

        if (!session?.access_token) {
            console.error('❌ No access token in session');
            showNotification('Authentication session expired. Please login again.', 'error');
            return;
        }

        console.log('✅ Got access token, making API request...');

        const response = await fetch('/api/user-assist', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        console.log('📡 API response status:', response.status);
        const data = await response.json();
        console.log('📋 User assist API response data:', data);

        if (response.ok) {
            console.log('✅ API call successful, displaying submissions');
            displayUserAssistSubmissions(data.feedback || []);
        } else {
            console.error('❌ API call failed with status:', response.status);
            console.error('❌ Error response:', data);
            console.error('Error details:', data.details);
            console.error('Error code:', data.code);
            console.error('Error hint:', data.hint);

            // Show detailed error to user
            showNotification(`Failed to load submissions: ${data.error || 'Unknown error'}. Details: ${data.details || 'None'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Network error in loadUserAssistSubmissions:', error);
        showNotification('Network error loading submissions. Check console for details.', 'error');
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
                <span>Type: ${sub.type ? sub.type.replace('_', ' ') : 'Unknown'}</span>
                <span>Submitted: ${sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
            ${sub.status === 'resolved' ? '<button class="close-btn" onclick="closeUserAssistSubmission(' + sub.id + ')">Close</button>' : ''}
        </div>
    `).join('');
}

async function closeUserAssistSubmission(submissionId) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showAuthModal();
            return;
        }

        const response = await fetch(`/api/user-assist/close/${submissionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Submission closed successfully!', 'success');
            loadUserAssistSubmissions(); // Refresh the list
        } else {
            showNotification(`Failed to close submission: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Close error:', error);
        showNotification('Failed to close submission. Please try again.', 'error');
    }
}

// ===== WATCHLIST FUNCTIONS =====

// Load watchlists for interface display (without modal)
async function loadUserWatchlistsForInterface() {
    if (!currentUser) {
        showAuthModal();
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showAuthModal();
            return;
        }

        const response = await fetch('/api/watchlists', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayUserWatchlists(data.watchlists || []);
        } else {
            showNotification(`Failed to load watchlists: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Failed to load watchlists:', error);
        showNotification('Failed to load watchlists. Please try again.', 'error');
    }
}

function displayUserWatchlists(watchlists) {
    const container = document.getElementById('watchlist-container');
    if (!container) return;

    if (!watchlists || watchlists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No watchlists yet. Create your first watchlist to get started!</p>
                <button class="create-watchlist-btn" onclick="showCreateWatchlistForm()">Create Watchlist</button>
            </div>
        `;
        return;
    }

    container.innerHTML = watchlists.map(watchlist => `
        <div class="watchlist-item" data-watchlist-id="${watchlist.id}">
            <div class="watchlist-header">
                <h4 class="watchlist-name">${watchlist.watchlist_name}</h4>
                <span class="watchlist-type">${watchlist.watchlist_category} • ${watchlist.market}</span>
                <button class="delete-watchlist-btn" onclick="deleteWatchlist(${watchlist.id})" title="Delete watchlist">🗑️</button>
            </div>

            <div class="watchlist-items-section">
                <div class="current-items" id="current-items-${watchlist.id}">
                    ${watchlist.items && watchlist.items.length > 0 ?
                        watchlist.items.map(item =>
                            `<span class="watchlist-item-tag">${item}
                                <button onclick="removeWatchlistItem(${watchlist.id}, '${item.replace(/'/g, "\\'")}')" class="remove-item-btn" title="Remove item">×</button>
                            </span>`
                        ).join('') :
                        '<span class="no-items">No items in this watchlist</span>'
                    }
                </div>

                <div class="add-item-section">
                    <input type="text" id="add-item-input-${watchlist.id}" placeholder="Add ${watchlist.watchlist_category} item..." class="add-item-input">
                    <button onclick="addItemToWatchlist(${watchlist.id}, '${watchlist.watchlist_category}', '${watchlist.market}')" class="add-item-btn">Add</button>
                </div>
            </div>
        </div>
    `).join('');
}

function showCreateWatchlistForm() {
    // Switch to create tab in the interface
    const createTab = document.querySelector('.watchlist-tab-btn[data-tab="create"]');
    if (createTab) {
        createTab.click();
    }
}



async function addItemToWatchlist(watchlistId, watchlistType, market) {
    const inputElement = document.getElementById(`add-item-input-${watchlistId}`);
    if (!inputElement) return;

    const itemName = inputElement.value.trim();
    if (!itemName) {
        showNotification('Please enter an item name', 'error');
        return;
    }

    // Check if item already exists in current items
    const currentItemsDiv = document.getElementById(`current-items-${watchlistId}`);
    if (currentItemsDiv && currentItemsDiv.textContent.includes(itemName)) {
        showNotification('Item already exists in watchlist', 'error');
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showAuthModal();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_name: itemName
            })
        });

        if (response.ok) {
            showNotification('Item added successfully!', 'success');
            inputElement.value = ''; // Clear input
            // Refresh watchlists display
            await loadUserWatchlistsForInterface();
        } else {
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            let errorData;
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
            } else {
                errorData = { error: `Server error: ${response.status} ${response.statusText}` };
            }
            showNotification(`Failed to add item: ${errorData.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error adding item to watchlist:', error);
        showNotification('Failed to add item. Please try again.', 'error');
    }
}

async function removeWatchlistItem(watchlistId, itemName) {
    if (!confirm(`Remove "${itemName}" from this watchlist?`)) {
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showAuthModal();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_name: itemName
            })
        });

        if (response.ok) {
            showNotification('Item removed successfully!', 'success');
            // Refresh watchlists display
            await loadUserWatchlistsForInterface();
        } else {
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            let errorData;
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
            } else {
                errorData = { error: `Server error: ${response.status} ${response.statusText}` };
            }
            showNotification(`Failed to remove item: ${errorData.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error removing item from watchlist:', error);
        showNotification('Failed to remove item. Please try again.', 'error');
    }
}

async function createNewWatchlist() {
    const name = document.getElementById('watchlist-name').value.trim();
    const type = document.getElementById('watchlist-type').value;
    const market = document.getElementById('watchlist-market').value;

    if (!name || !type) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showAuthModal();
            return;
        }

        const response = await fetch('/api/watchlists/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                type,
                market
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Watchlist created successfully!', 'success');
            closeModal('create-watchlist-modal');
            // Refresh watchlists
            loadUserWatchlists();
        } else {
            showNotification(`Failed to create watchlist: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Create watchlist error:', error);
        showNotification('Failed to create watchlist. Please try again.', 'error');
    }
}

// Form event handler for create watchlist form
document.addEventListener('DOMContentLoaded', () => {
    const createWatchlistForm = document.getElementById('create-watchlist-form');
    if (createWatchlistForm) {
        createWatchlistForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createNewWatchlist();
        });
    }
});

async function deleteWatchlist(watchlistId) {
    if (!confirm('Are you sure you want to delete this watchlist? This action cannot be undone.')) {
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            showAuthModal();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification('Watchlist deleted successfully!', 'success');
            loadUserWatchlistsForInterface(); // Refresh the list
        } else {
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            let errorData;
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
            } else {
                errorData = { error: `Server error: ${response.status} ${response.statusText}` };
            }
            showNotification(`Failed to delete watchlist: ${errorData.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Delete watchlist error:', error);
        showNotification('Failed to delete watchlist. Please try again.', 'error');
    }
}

async function viewWatchlistNews(watchlistId) {
    // For now, just show a notification - full implementation would open news filtered by this watchlist
    showNotification('Watchlist news filtering coming soon!', 'info');
}

// Navigation event listeners with comprehensive authentication checks
function initNavigation() {
    // Add hover event listener for watchlist submenu
    const watchlistMain = document.querySelector('.watchlist-main');
    if (watchlistMain) {
        watchlistMain.addEventListener('mouseenter', () => {
            // Calculate and set submenu position
            const rect = watchlistMain.getBoundingClientRect();
            const submenu = document.getElementById('watchlist-submenus');
            if (submenu) {
                submenu.style.top = rect.top + 'px';
            }

            // Load watchlist submenus on hover
            loadWatchlistSubmenus();
        });
    }

    // Navigation links with authentication checks
    document.querySelectorAll('[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const navType = e.target.closest('[data-nav]').getAttribute('data-nav');

            // Functions that don't require authentication
            const noAuthRequired = ['logout'];

            // Functions that require authentication but may not be fully implemented
            const comingSoonFeatures = ['alerts', 'analysis', 'editor-pick'];

            // Functions that require authentication and have interfaces
            const interfaceFeatures = ['search', 'read-later', 'watchlist', 'user-assist'];

            // Skip authentication for functions that don't need it
            if (noAuthRequired.includes(navType)) {
                if (navType === 'logout') {
                    logout();
                }
                return;
            }

            // Check authentication for user-specific features
            if (!currentUser) {
                showAuthModal();
                return;
            }

            // Handle coming soon features
            if (comingSoonFeatures.includes(navType)) {
                showNotification('This feature is coming soon!', 'info');
                return;
            }

            // Handle interface features (replace content instead of modal)
            if (interfaceFeatures.includes(navType)) {
                // Close any open interfaces first to ensure only one shows at a time
                closeAllInterfaces();

                if (navType === 'search') {
                    // Show search interface
                    hideHomeContent();
                    showSearchInterface();
                } else if (navType === 'read-later') {
                    // Toggle read later filter mode
                    toggleReadLaterFilter();
                } else if (navType === 'watchlist') {
                    // Show watchlist interface
                    hideHomeContent();
                    showWatchlistInterface();
                } else if (navType === 'user-assist') {
                    // Show user assist interface
                    hideHomeContent();
                    showUserAssistInterface();
                }
            }
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
                loadNews();
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
        userAssistForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const title = e.target.querySelector('#issue-title').value.trim();
            const description = e.target.querySelector('#issue-description').value.trim();
            const activeTab = document.querySelector('#user-assist-interface .tab-btn.active');
            const type = activeTab ? activeTab.getAttribute('data-tab') : 'bug-reports';

            // Map tab types to API types
            const apiType = type === 'bug-reports' ? 'bug_report' : 'feature_request';

            if (!title || !description) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            if (!currentUser || !currentUser.id) {
                showNotification('You must be logged in to submit feedback', 'error');
                return;
            }

            // Show loading state
            const submitBtn = e.target.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            try {
                // Get the JWT token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    showNotification('Authentication session expired. Please login again.', 'error');
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/user-assist`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: apiType,
                        title: title,
                        description: description
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showNotification('Feedback submitted successfully!', 'success');
                    // Clear form
                    form.reset();
                    // Reload submissions
                    loadUserAssistSubmissions();
                } else {
                    showNotification(`Failed to submit feedback: ${data.error || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Submit error:', error);
                showNotification('Failed to submit feedback. Please try again.', 'error');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
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

        const response = await fetch(`${API_BASE_URL}/api/user-assist`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayUserAssistSubmissions(data.feedback || []);
        } else {
            console.error('Failed to load submissions:', data.error);
            showNotification('Failed to load submissions', 'error');
        }
    } catch (error) {
        console.error('Failed to load submissions:', error);
        showNotification('Failed to load submissions', 'error');
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
                <span>Type: ${sub.type ? sub.type.replace('_', ' ') : 'Unknown'}</span>
                <span>Submitted: ${sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
            ${sub.status === 'resolved' ? '<button class="close-btn" onclick="closeUserAssistSubmission(' + sub.id + ')">Close</button>' : ''}
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
    loadNews();
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
async function handleReadLaterClick(event, articleId, action) {
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
    if (!isLoggedIn || !currentUser || !currentUser.id) {
        revertOptimisticUpdate(iconElement, wasSaved, articleId, newAction === 'add' ? 'add' : 'remove', 'You must be logged in to manage your Read Later list');
        showLoginModal();
        return;
    }

    // Get the JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        revertOptimisticUpdate(iconElement, wasSaved, articleId, newAction === 'add' ? 'add' : 'remove', 'Authentication session expired. Please login again.');
        showLoginModal();
        return;
    }

    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };

    // Now make the API call in the background
    if (newAction === 'add') {
        // Add to read later via API
        fetch(`${API_BASE_URL}/api/user/read-later`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                article_id: articleId,
                title: iconElement.closest('.news-card').querySelector('.news-title')?.textContent || 'Article',
                url: '#', // We'll use the article ID for now
                sector: iconElement.closest('.news-card').querySelector('.meta-sector')?.textContent || 'General',
                source_system: 'web'
            })
        })
        .then(response => {
            // Store response status for use in next then()
            const responseOk = response.ok;
            return response.json().then(data => ({ responseOk, data }));
        })
        .then(({ responseOk, data }) => {
            iconElement.classList.remove('processing');
            if (responseOk) {
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
        fetch(`${API_BASE_URL}/api/user/read-later`, {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({
                article_id: articleId
            })
        })
        .then(response => {
            // Store response status for use in next then()
            const responseOk = response.ok;
            return response.json().then(data => ({ responseOk, data }));
        })
        .then(({ responseOk, data }) => {
            iconElement.classList.remove('processing');
            if (responseOk) {
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

// ===== WATCHLIST SUBMENU FUNCTIONS =====
function toggleWatchlistSubmenu(event) {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    const submenu = document.getElementById('watchlist-submenus');

    if (!submenu) return;

    // Toggle submenu visibility
    const isVisible = submenu.style.opacity === '1' || submenu.style.visibility === 'visible';

    if (isVisible) {
        // Hide submenu
        submenu.style.opacity = '0';
        submenu.style.visibility = 'hidden';
        submenu.style.transform = 'translateX(-10px)';
    } else {
        // Show submenu
        submenu.style.opacity = '1';
        submenu.style.visibility = 'visible';
        submenu.style.transform = 'translateX(0)';
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
