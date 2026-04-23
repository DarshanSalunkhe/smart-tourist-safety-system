import { authAPIService } from '../services/auth-api.js';

// Make logout available globally for onclick handlers
window.handleLogout = function() {
  console.log('[LandingPage] Logout clicked');
  authAPIService.logout();
};

export function LandingPage() {
  const user = authAPIService.getCurrentUser();
  
  // Determine navigation buttons based on login status
  const navButtons = user ? `
    <button class="btn-nav-secondary" onclick="location.hash='#/${user.role}'">Go to Dashboard</button>
    <button class="btn-nav-primary" onclick="window.handleLogout()">Logout</button>
  ` : `
    <button class="btn-nav-secondary" onclick="location.hash='#/login'">Login</button>
    <button class="btn-nav-primary" onclick="location.hash='#/register'">Sign Up</button>
  `;
  
  // Determine hero action buttons based on login status
  const heroButtons = user ? `
    <button class="btn-hero-primary" onclick="location.hash='#/${user.role}'">
      Go to Dashboard
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  ` : `
    <button class="btn-hero-primary" onclick="location.hash='#/register'">
      Get Started
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button class="btn-hero-secondary" onclick="location.hash='#/login'">Login</button>
  `;
  
  // Determine CTA buttons based on login status
  const ctaButtons = user ? `
    <button class="btn-cta-primary" onclick="location.hash='#/${user.role}'">Go to Dashboard</button>
  ` : `
    <button class="btn-cta-primary" onclick="location.hash='#/register'">Create Account</button>
    <button class="btn-cta-secondary" onclick="location.hash='#/login'">Login</button>
  `;
  
  return `
    <div class="landing-page">
      <!-- Header / Navbar -->
      <nav class="landing-nav">
        <div class="landing-nav-content">
          <div class="landing-brand">
            <div class="landing-logo">🛡️</div>
            <span class="landing-brand-text">SafeTrip Companion</span>
          </div>
          <div class="landing-nav-actions">
            ${navButtons}
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="landing-hero">
        <div class="landing-hero-content">
          <div class="landing-hero-text">
            <h1 class="landing-hero-title">Your AI-Powered Safety Companion</h1>
            <p class="landing-hero-subtitle">Real-time alerts, emergency support, and smart travel guidance wherever you go.</p>
            <div class="landing-hero-actions">
              ${heroButtons}
            </div>
          </div>
          <div class="landing-hero-visual">
            <div class="landing-mockup-card">
              <div class="mockup-header">
                <div class="mockup-dot"></div>
                <div class="mockup-dot"></div>
                <div class="mockup-dot"></div>
              </div>
              <div class="mockup-content">
                <div class="mockup-alert">
                  <div class="mockup-alert-icon">⚠️</div>
                  <div class="mockup-alert-text">
                    <div class="mockup-alert-title">Safety Alert</div>
                    <div class="mockup-alert-desc">High risk area detected nearby</div>
                  </div>
                </div>
                <div class="mockup-score">
                  <div class="mockup-score-label">Route Safety Score</div>
                  <div class="mockup-score-value">
                    <span class="mockup-score-number">85</span>
                    <span class="mockup-score-max">/100</span>
                  </div>
                  <div class="mockup-score-bar">
                    <div class="mockup-score-fill" style="width: 85%"></div>
                  </div>
                </div>
                <div class="mockup-sos">
                  <button class="mockup-sos-btn">
                    <span class="mockup-sos-icon">🚨</span>
                    <span class="mockup-sos-text">Emergency SOS</span>
                  </button>
                </div>
                <div class="mockup-ai">
                  <div class="mockup-ai-avatar">🤖</div>
                  <div class="mockup-ai-bubble">
                    <div class="mockup-ai-text">Your route looks safe. Stay alert near the market area.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust Strip -->
      <section class="landing-trust">
        <div class="landing-trust-content">
          <div class="landing-trust-item">
            <div class="landing-trust-icon">🤖</div>
            <div class="landing-trust-text">AI Powered</div>
          </div>
          <div class="landing-trust-item">
            <div class="landing-trust-icon">⚡</div>
            <div class="landing-trust-text">Real-Time Alerts</div>
          </div>
          <div class="landing-trust-item">
            <div class="landing-trust-icon">🚨</div>
            <div class="landing-trust-text">Emergency Ready</div>
          </div>
          <div class="landing-trust-item">
            <div class="landing-trust-icon">🔒</div>
            <div class="landing-trust-text">Private & Secure</div>
          </div>
        </div>
      </section>

      <!-- Mini Feature Section -->
      <section class="landing-features">
        <div class="landing-features-content">
          <div class="landing-feature-card">
            <div class="landing-feature-icon">⚠️</div>
            <h3 class="landing-feature-title">Smart Alerts</h3>
            <p class="landing-feature-desc">Get instant warnings for risky areas.</p>
          </div>
          <div class="landing-feature-card">
            <div class="landing-feature-icon">🚨</div>
            <h3 class="landing-feature-title">Emergency Help</h3>
            <p class="landing-feature-desc">Quick SOS access when needed.</p>
          </div>
          <div class="landing-feature-card">
            <div class="landing-feature-icon">🤖</div>
            <h3 class="landing-feature-title">Travel Assistant</h3>
            <p class="landing-feature-desc">AI guidance during your journey.</p>
          </div>
        </div>
      </section>

      <!-- Final CTA Section -->
      <section class="landing-cta">
        <div class="landing-cta-content">
          <h2 class="landing-cta-title">Start Safe. Travel Smart.</h2>
          <div class="landing-cta-actions">
            ${ctaButtons}
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="landing-footer-content">
          <div class="landing-footer-text">© ${new Date().getFullYear()} SafeTrip Companion</div>
          <div class="landing-footer-links">
            <a href="#" class="landing-footer-link">Privacy</a>
            <a href="#" class="landing-footer-link">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  `;
}
