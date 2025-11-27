// Supabase configuration
const SUPABASE_URL = 'https://qqzyizvglvxkupssowex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxenlpenZnbHZrdXBzc293ZXgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5MzAwNjU3NiwiZXhwIjoyMDA4NTYzODc2fQ.zMje_fGJRmj5dmJLfWLKgN6tbBYXiRRo1t3Hu6Rjtnc';

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

// Load user data (placeholder)
function loadUserData() {
    console.log('User logged in:', currentUser.email);
    // TODO: Load bookmarks, watchlists, etc.
}

// Clear user data (placeholder)
function clearUserData() {
    console.log('User logged out');
    // TODO: Clear local data
}

// Event listeners
loginBtn.addEventListener('click', loginWithGoogle);
logoutBtn.addEventListener('click', logout);

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', initAuth);

// Export for potential use in other scripts
window.app = {
    supabase,
    currentUser,
    loginWithGoogle,
    logout
};
