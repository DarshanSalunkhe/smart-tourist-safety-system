import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { RoleSelectionPage } from './pages/RoleSelectionPage.js';
import { TouristDashboard } from './pages/TouristDashboard.js';
import { AuthorityDashboard } from './pages/AuthorityDashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { IncidentResponseCenter } from './pages/IncidentResponseCenter.js';
import { authAPIService } from './services/auth-api.js';

const routes = {
  '/': LandingPage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/select-role': RoleSelectionPage,
  '/tourist': TouristDashboard,
  '/authority': AuthorityDashboard,
  '/admin': AdminDashboard
};

let currentPage = null;
let _navigateFn = null; // exported handle

export function renderCurrentRoute() {
  if (_navigateFn) _navigateFn();
}

export function initRouter(app) {
  function cleanupCurrentPage() {
    // Cleanup location service when leaving tourist dashboard
    if (currentPage === '/tourist') {
      console.log('🧹 Cleaning up TouristDashboard...');
      import('./services/location.js').then(({ locationService }) => {
        locationService.cleanup();
      }).catch(err => {
        console.warn('Failed to cleanup location service:', err);
      });
    }
    
    // Cleanup demo mode when leaving admin dashboard
    if (currentPage === '/admin') {
      console.log('🧹 Cleaning up AdminDashboard...');
      import('./services/demo-mode.js').then(({ demoModeService }) => {
        demoModeService.cleanup();
      }).catch(err => {
        console.warn('Failed to cleanup demo mode service:', err);
      });
    }
  }
  
  function navigate() {
    try {
      const hash = window.location.hash.slice(1) || '/';
      console.log('🗺️ Navigating to:', hash);
      
      // Check for dynamic routes (e.g., /authority/incident/:id)
      let route = routes[hash];
      let routeParams = null;
      
      // Handle /authority/incident/:incidentId route
      if (hash.startsWith('/authority/incident/')) {
        const incidentId = hash.split('/')[3];
        console.log('📋 Loading incident:', incidentId);
        route = () => IncidentResponseCenter(incidentId);
        routeParams = { incidentId };
      }
      
      // Extract OAuth tokens from URL if present
      const urlParams = new URLSearchParams(hash.split('?')[1]);
      const token = urlParams.get('token');
      const refresh = urlParams.get('refresh');
      
      if (token && refresh) {
        console.log('🔑 OAuth tokens found in URL, storing...');
        localStorage.setItem('st_access_token', token);
        localStorage.setItem('st_refresh_token', refresh);
        
        // Fetch user data with the new token
        const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';
        fetch(`${API_URL}/auth/user`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            authAPIService.currentUser = data.user;
            console.log('✅ User data loaded from OAuth');
          }
          // Clean URL by removing tokens
          const cleanHash = hash.split('?')[0];
          window.location.hash = '#' + cleanHash;
        })
        .catch(err => {
          console.error('❌ Failed to load user data:', err);
        });
        return;
      }
      
      // Cleanup previous page before navigating
      if (currentPage && currentPage !== hash) {
        cleanupCurrentPage();
      }
      
      // Use dynamic route if found, otherwise use static routes
      if (!route) {
        route = routes[hash] || routes['/'];
      }
      
      if (!route) {
        console.error('❌ Route not found:', hash);
        app.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1>404 - Page Not Found</h1></div>';
        return;
      }
      
      const user = authAPIService.getCurrentUser();
      
      // Public routes that don't require authentication
      const publicRoutes = ['/', '/login', '/register', '/select-role'];
      
      // Allow landing page and login to be accessed even when logged in
      // Users can manually navigate to their dashboard from the landing page
      
      // Redirect to landing if trying to access protected route without authentication
      if (!user && !publicRoutes.includes(hash) && !hash.startsWith('/authority/incident/')) {
        console.log('🔒 Protected route, redirecting to landing...');
        window.location.hash = '#/';
        return;
      }
      
      // Render the page
      console.log('✅ Rendering page:', hash);
      app.innerHTML = route();
      
      // Update current page after successful render
      currentPage = hash;
      
    } catch (error) {
      console.error('❌ Navigation error:', error);
      app.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h1 style="color: #ef4444;">⚠️ Error Loading Page</h1>
          <p>${error.message}</p>
          <button onclick="location.hash='#/'" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Go to Home
          </button>
        </div>
      `;
    }
  }
  
  window.addEventListener('hashchange', navigate);
  
  // Expose navigate so renderCurrentRoute() can call it
  _navigateFn = navigate;
  
  // Cleanup on page unload (tab close, refresh, etc.)
  window.addEventListener('beforeunload', () => {
    console.log('🧹 Page unloading, cleaning up...');
    cleanupCurrentPage();
  });
  
  navigate();
  
  console.log('✅ Router initialized');
}
