import { useEffect, useState } from 'react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize authentication
    console.log('🧪 GOOGLE AUTH TEST PAGE LOADED');

    // Load authentication system
    if (typeof window !== 'undefined' && window.authManager) {
      window.authManager.initialize().then(() => {
        const currentUser = window.authManager.getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);
        console.log('🧪 Auth initialized, user:', currentUser);

        // Additional check: Force button rendering after component mount
        setTimeout(() => {
          if (window.authManager && window.authManager.renderGoogleButton) {
            window.authManager.renderGoogleButton();
          }
        }, 500);
      }).catch(err => {
        console.error('🧪 Auth initialization failed:', err);
        setIsLoading(false);
      });

      // Listen for auth changes
      window.addEventListener('auth-success', (e) => {
        console.log('🧪 Auth success event:', e.detail);
        setUser(e.detail.user);
      });

      window.addEventListener('auth-logout', () => {
        console.log('🧪 Auth logout event');
        setUser(null);
      });
    } else {
      console.log('🧪 Waiting for authManager to load...');
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  }, []);

  // Additional effect to ensure button renders after DOM is ready
  useEffect(() => {
    if (!isLoading && !user) {
      // Force button rendering after DOM updates
      const timer = setTimeout(() => {
        if (window.authManager && window.authManager.renderGoogleButton) {
          console.log('🧪 Force button rendering after component mount...');
          window.authManager.renderGoogleButton();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  const handleSignOut = () => {
    console.log('🧪 Sign out button clicked');
    if (window.authManager) {
      window.authManager.logout();
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>🧪 Google Auth Test</h1>
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Google Authentication Test</h1>
      <p><strong>This page only tests Google OAuth functionality.</strong></p>

      {!user ? (
        <div>
          <p>You are not signed in.</p>
          <div id="gsi-button" style={{ margin: '20px auto', maxWidth: '400px' }}></div>
          <p><em>Click the Google Sign-In button above to test authentication.</em></p>
        </div>
      ) : (
        <div>
          <h2 style={{ color: '#34a853' }}>✅ Authentication Successful!</h2>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px auto',
            maxWidth: '500px',
            border: '1px solid #dadce0'
          }}>
            <h3>Welcome, {user.name || user.email}!</h3>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Provider:</strong> {user.login_method || 'google'}</p>
            {user.picture && (
              <img
                src={user.picture}
                alt="Profile"
                style={{ width: '50px', height: '50px', borderRadius: '50%', marginTop: '10px' }}
              />
            )}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              backgroundColor: '#ea4335',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              fontSize: '14px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      <div style={{ marginTop: '50px', fontSize: '12px', color: '#666' }}>
        <p><strong>Console Logs to Check:</strong></p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>🚨 FORCED GOOGLE AUTH: Overriding config</li>
          <li>🔑 Setting up Google authentication</li>
          <li>✅ Google Identity Services initialized with button</li>
          <li>🔐 Processing Google sign-in</li>
        </ul>
      </div>
    </div>
  );
}
