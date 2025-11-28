// Supabase configuration
const SUPABASE_URL = 'https://qqzyizvglvxkupssowex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxenlpenZnbHZ4a3Vwc3Nvd2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjg5NjksImV4cCI6MjA3ODkwNDk2OX0.F5Y1TCuWwmN3kxTX5HyvGFQ5fSXyba7F41M99bvA-DU';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        logoutBtn.style.display = 'inline-block';
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
        logoutBtn.style.display = 'none';
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
const newsContainer = document.getElementById('news-container');
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
}

// Create article element
function createArticleElement(article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-card';
    articleDiv.dataset.articleId = article.id;

    // Article header with image and content
    const articleHeader = document.createElement('div');
    articleHeader.className = 'article-header';

    // Article image/initials
    const articleImage = document.createElement('div');
    articleImage.className = 'article-image';
    const initials = getInitials(article.source_links?.[0]?.source || article.title);
    articleImage.textContent = initials;

    // Article content
    const articleContent = document.createElement('div');
    articleContent.className = 'article-content';

    const title = document.createElement('h3');
    title.textContent = article.title;

    const summary = document.createElement('p');
    summary.textContent = article.summary;

    const meta = document.createElement('div');
    meta.className = 'article-meta';

    const market = document.createElement('span');
    market.textContent = article.market;

    const sector = document.createElement('span');
    sector.textContent = article.sector;

    const impact = document.createElement('span');
    impact.textContent = `Impact: ${article.impact_score || 'N/A'}`;
    impact.className = 'impact-score';

    const date = document.createElement('span');
    date.textContent = new Date(article.published_at).toLocaleDateString();

    meta.appendChild(market);
    meta.appendChild(sector);
    meta.appendChild(impact);
    meta.appendChild(date);

    articleContent.appendChild(title);
    articleContent.appendChild(summary);
    articleContent.appendChild(meta);

    articleHeader.appendChild(articleImage);
    articleHeader.appendChild(articleContent);

    // Article sources
    const sources = document.createElement('div');
    sources.className = 'article-sources';

    if (article.source_links && article.source_links.length > 0) {
        article.source_links.forEach(link => {
            const sourceLink = document.createElement('a');
            sourceLink.href = link.url;
            sourceLink.target = '_blank';
            sourceLink.textContent = link.source;
            sources.appendChild(sourceLink);
        });
    }

    // Article actions
    const actions = document.createElement('div');
    actions.className = 'article-actions';

    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'bookmark-btn';
    bookmarkBtn.textContent = 'Bookmark';
    bookmarkBtn.onclick = () => toggleBookmark(article.id, bookmarkBtn);

    actions.appendChild(bookmarkBtn);

    articleDiv.appendChild(articleHeader);
    articleDiv.appendChild(sources);
    articleDiv.appendChild(actions);

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
    currentPage = pagination.page;
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;

    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
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
    if (!currentUser) return;

    try {
        // Get the JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            console.error('No access token available');
            return;
        }

        const response = await fetch('/api/user/read-later', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.bookmarks) {
            // Store bookmarks for UI updates
            window.userBookmarks = new Set(data.bookmarks.map(b => b.article_id));
            updateBookmarkButtons();
        } else {
            console.error('Invalid bookmarks response:', data);
            window.userBookmarks = new Set();
        }
    } catch (error) {
        console.error('Failed to load bookmarks:', error);
        window.userBookmarks = new Set();
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
logoutBtn.addEventListener('click', logout);

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initMarketTabs();
    initModals();
    initNavigation();

    // Load initial data
    loadNews(1);
});

// Export for potential use in other scripts
window.app = {
    supabase,
    currentUser,
    loginWithGoogle,
    logout
};
