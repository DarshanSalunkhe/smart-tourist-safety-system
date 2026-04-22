import { authAPIService } from '../services/auth-api.js';
import { i18n } from '../services/i18n.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export function RoleSelectionPage() {
  setTimeout(() => {
    checkPendingUser();
    setupRoleSelection();
  }, 0);

  async function checkPendingUser() {
    try {
      console.log('[RoleSelection] Checking for pending user...');
      
      const response = await fetch(`${API_URL}/auth/pending-google-user`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('[RoleSelection] Server error:', response.status);
        throw new Error('Server error');
      }
      
      const data = await response.json();
      console.log('[RoleSelection] Response:', data);
      
      if (!data.pending) {
        console.log('[RoleSelection] No pending user found, retrying in 1 second...');
        setTimeout(async () => {
          const retryResponse = await fetch(`${API_URL}/auth/pending-google-user`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
          const retryData = await retryResponse.json();
          
          if (!retryData.pending) {
            console.log('[RoleSelection] Still no pending user, redirecting to login');
            window.location.hash = '#/login';
          } else {
            displayUserInfo(retryData.user);
          }
        }, 1000);
        return;
      }
      
      // Display user info
      displayUserInfo(data.user);
      
    } catch (error) {
      console.error('[RoleSelection] Error checking pending user:', error);
      // Don't redirect immediately, show error message
      const errorDiv = document.getElementById('errorMessage');
      if (errorDiv) {
        errorDiv.textContent = 'Unable to load user information. Please try signing in again.';
        errorDiv.style.display = 'block';
      }
      
      setTimeout(() => {
        window.location.hash = '#/login';
      }, 3000);
    }
  }
  
  function displayUserInfo(user) {
    const userInfo = document.getElementById('pendingUserInfo');
    if (userInfo && user) {
      console.log('[RoleSelection] Displaying user info for:', user.email);
      userInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; margin-bottom: 1.5rem;">
          ${user.picture ? `<img src="${user.picture}" alt="${user.name}" style="width: 60px; height: 60px; border-radius: 50%;">` : ''}
          <div>
            <div style="font-weight: 600; font-size: 1.1rem;">${user.name}</div>
            <div style="color: var(--text-light); font-size: 0.9rem;">${user.email}</div>
          </div>
        </div>
      `;
    }
  }

  function setupRoleSelection() {
    const form = document.getElementById('roleSelectionForm');
    const roleCards = document.querySelectorAll('.role-card');
    let selectedRole = null;

    // Role card selection
    roleCards.forEach(card => {
      card.addEventListener('click', () => {
        roleCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedRole = card.dataset.role;
        
        // Enable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
      });
    });

    // Form submission
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!selectedRole) {
        alert('Please select a role');
        return;
      }
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Completing Registration...';
      
      const phone = document.getElementById('phone').value;
      const emergencyContact = document.getElementById('emergencyContact').value;
      
      try {
        const user = await authAPIService.completeGoogleRegistration(selectedRole, phone, emergencyContact);
        
        if (user) {
          console.log('[RoleSelection] Registration complete, redirecting to dashboard');
          // Redirect based on role
          if (user.role === 'tourist') window.location.hash = '#/tourist';
          else if (user.role === 'authority') window.location.hash = '#/authority';
          else if (user.role === 'admin') window.location.hash = '#/admin';
        }
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        // Show error message
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 5000);
      }
    });
  }

  return `
    <div class="auth-container">
      <div class="auth-card" style="max-width: 600px;">
        <div class="auth-header">
          <h1>🛡️ Complete Your Registration</h1>
          <p>Select your role to continue</p>
        </div>
        
        <div id="pendingUserInfo"></div>
        
        <div id="errorMessage" style="display: none; padding: 0.75rem; background: var(--danger); color: white; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center;"></div>
        
        <form id="roleSelectionForm">
          <div style="margin-bottom: 2rem;">
            <label style="display: block; margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem;">
              Choose Your Role:
            </label>
            
            <div style="display: grid; gap: 1rem;">
              <!-- Tourist Role -->
              <div class="role-card" data-role="tourist" style="padding: 1.5rem; border: 2px solid var(--border); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; align-items: start; gap: 1rem;">
                  <div style="font-size: 2.5rem;">🧳</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">Tourist</div>
                    <div style="color: var(--text-light); font-size: 0.9rem;">
                      Access safety features, location tracking, incident reporting, and emergency SOS
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Authority Role -->
              <div class="role-card" data-role="authority" style="padding: 1.5rem; border: 2px solid var(--border); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; align-items: start; gap: 1rem;">
                  <div style="font-size: 2.5rem;">👮</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">Authority</div>
                    <div style="color: var(--text-light); font-size: 0.9rem;">
                      Monitor tourists, manage incidents, respond to emergencies, and view analytics
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Admin Role -->
              <div class="role-card" data-role="admin" style="padding: 1.5rem; border: 2px solid var(--border); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; align-items: start; gap: 1rem;">
                  <div style="font-size: 2.5rem;">⚙️</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">Administrator</div>
                    <div style="color: var(--text-light); font-size: 0.9rem;">
                      Manage users, configure risk zones, system settings, and view all analytics
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
              Additional Information (Optional)
            </label>
            
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" class="form-control" placeholder="+91-9876543210">
            </div>
            
            <div class="form-group">
              <label for="emergencyContact">Emergency Contact</label>
              <input type="tel" id="emergencyContact" class="form-control" placeholder="+91-9999999999">
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" disabled style="opacity: 0.5;">
            Complete Registration
          </button>
        </form>
        
        <p style="text-align: center; margin-top: 1rem; font-size: 0.9rem; color: var(--text-light);">
          <a href="#/login" style="color: var(--primary);">← Back to Login</a>
        </p>
      </div>
    </div>
    
    <style>
      .role-card:hover {
        border-color: var(--primary);
        background: var(--bg-secondary);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
      }
      
      .role-card.selected {
        border-color: var(--primary);
        background: rgba(37, 99, 235, 0.05);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .role-card.selected::before {
        content: '✓';
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 24px;
        height: 24px;
        background: var(--primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .role-card {
        position: relative;
      }
    </style>
  `;
}
