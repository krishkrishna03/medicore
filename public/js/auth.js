// ===== AUTH MODULE =====
// Login/Register are handled by home.js (single login overlay)
// This module manages session state and is referenced by app.js

const Auth = {
  currentUser: null,

  init() {
    // Try to restore session from localStorage
    const token = localStorage.getItem('hms_token');
    const userJson = localStorage.getItem('hms_user');
    if (token && userJson) {
      try {
        Auth.currentUser = JSON.parse(userJson);
        api.setToken(token);
        // home.js initHomePage() will handle showing the dashboard
        return;
      } catch {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('hms_user');
      }
    }
  },

  logout() {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    Auth.currentUser = null;
    api.setToken(null);
    // Show home site
    document.getElementById('app-section').classList.add('hidden');
    document.getElementById('home-site').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.ui) ui.toast('You have been logged out', 'success');
  },
};

window.Auth = Auth;
