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
        // Load user data
        loadUserData();
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
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

// News state
let currentPage = 1;
let currentMarket = 'US';
let currentSector = '';
let currentSearch = '';

// DOM elements
const marketSelect = document.getElementById('market-select');
const sectorSelect = document.getElementById('sector-select');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const newsContainer = document.getElementById('news-container');
const paginationContainer = document.querySelector('#pagination');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');

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

    const title = document.createElement('h3');
    title.textContent = article.title;

    const summary = document.createElement('p');
    summary.textContent = article.summary;

    const meta = document.createElement('div');
    meta.className = 'article-meta';

    const market = document.createElement('span');
    market.textContent = `Market: ${article.market}`;

    const sector = document.createElement('span');
    sector.textContent = `Sector: ${article.sector}`;

    const impact = document.createElement('span');
    impact.textContent = `Impact: ${article.impact_score || 'N/A'}`;
    impact.className = 'impact-score';

    const date = document.createElement('span');
    date.textContent = new Date(article.published_at).toLocaleDateString();

    meta.appendChild(market);
    meta.appendChild(sector);
    meta.appendChild(impact);
    meta.appendChild(date);

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

    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'bookmark-btn';
    bookmarkBtn.textContent = 'Bookmark';
    bookmarkBtn.onclick = () => toggleBookmark(article.id, bookmarkBtn);

    articleDiv.appendChild(title);
    articleDiv.appendChild(summary);
    articleDiv.appendChild(meta);
    articleDiv.appendChild(sources);
    articleDiv.appendChild(bookmarkBtn);

    return articleDiv;
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
        if (button.textContent === 'Bookmark') {
            // Add bookmark
            const response = await fetch('/api/user/read-later', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            }
        } else {
            // Remove bookmark
            const response = await fetch('/api/user/read-later', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ article_id: articleId })
            });

            if (response.ok) {
                button.textContent = 'Bookmark';
                button.classList.remove('bookmarked');
            }
        }
    } catch (error) {
        console.error('Bookmark error:', error);
        alert('Failed to update bookmark');
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
        const response = await fetch('/api/user/read-later');
        const data = await response.json();
        // Store bookmarks for UI updates
        window.userBookmarks = new Set(data.bookmarks.map(b => b.article_id));
        updateBookmarkButtons();
    } catch (error) {
        console.error('Failed to load bookmarks:', error);
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

// Event listeners
loginBtn.addEventListener('click', loginWithGoogle);
logoutBtn.addEventListener('click', logout);

// Filter event listeners
marketSelect.addEventListener('change', (e) => {
    currentMarket = e.target.value || 'US';
    currentPage = 1;
    loadSectors();
    loadNews(1);
});

sectorSelect.addEventListener('change', (e) => {
    currentSector = e.target.value;
    currentPage = 1;
    loadNews(1);
});

searchBtn.addEventListener('click', () => {
    currentSearch = searchInput.value.trim();
    currentPage = 1;
    loadNews(1);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Pagination event listeners
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        loadNews(currentPage - 1);
    }
});

nextBtn.addEventListener('click', () => {
    loadNews(currentPage + 1);
});

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadMarkets();
    loadSectors();
    loadNews(1);
});

// Export for potential use in other scripts
window.app = {
    supabase,
    currentUser,
    loginWithGoogle,
    logout
};
