import { authAPIService } from '../services/auth-api.js';
import { i18n } from '../services/i18n.js';

export function RegisterPage() {
  setTimeout(() => {
    const form = document.getElementById('registerForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = i18n.t('loading');
      
      const phoneCountry = document.getElementById('phoneCountry').value;
      const phoneNumber = document.getElementById('phone').value.replace(/^0+/, '');
      const emergencyCountry = document.getElementById('emergencyCountry').value;
      const emergencyNumber = document.getElementById('emergencyContact').value.replace(/^0+/, '');
      
      const userData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: phoneCountry + phoneNumber,
        emergencyContact: emergencyCountry + emergencyNumber,
        role: document.getElementById('role').value
      };
      
      try {
        const user = await authAPIService.register(userData);
        
        // Show success message
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = i18n.t('registration_success');
        successDiv.style.display = 'block';
        
        // Redirect to appropriate dashboard based on role
        setTimeout(() => {
          if (user.role === 'tourist') window.location.hash = '#/tourist';
          else if (user.role === 'authority') window.location.hash = '#/authority';
          else if (user.role === 'admin') window.location.hash = '#/admin';
          else window.location.hash = '#/login';
        }, 1000);
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalText;
        
        // Show error message
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = error.message || 'Registration failed';
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 3000);
      }
    });
  }, 0);

  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">🛡️</div>
          <h1>Create account</h1>
          <p>Join the SafeTrip safety network</p>
        </div>

        <div id="successMessage" class="alert-msg success" style="display:none;"></div>
        <div id="errorMessage" class="alert-msg error" style="display:none;"></div>

        <form id="registerForm">
          <div class="form-group">
            <label for="name">Full name</label>
            <input type="text" id="name" class="form-control" placeholder="Your full name" required autocomplete="name">
          </div>

          <div class="form-group">
            <label for="email">Email address</label>
            <input type="email" id="email" class="form-control" placeholder="you@example.com" required autocomplete="email">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" class="form-control" placeholder="Min. 6 characters" required minlength="6" autocomplete="new-password">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone</label>
              <div style="display: flex; gap: 0.5rem;">
                <select id="phoneCountry" class="form-control" style="flex: 0 0 120px; font-size: 0.9rem;">
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+60">🇲🇾 +60</option>
                  <option value="+66">🇹🇭 +66</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+27">🇿🇦 +27</option>
                  <option value="+20">🇪🇬 +20</option>
                </select>
                <input type="tel" id="phone" class="form-control" placeholder="XXXXXXXXXX" required style="flex: 1;">
              </div>
            </div>
            <div class="form-group">
              <label for="emergencyContact">Emergency contact</label>
              <div style="display: flex; gap: 0.5rem;">
                <select id="emergencyCountry" class="form-control" style="flex: 0 0 120px; font-size: 0.9rem;">
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+60">🇲🇾 +60</option>
                  <option value="+66">🇹🇭 +66</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+27">🇿🇦 +27</option>
                  <option value="+20">🇪🇬 +20</option>
                </select>
                <input type="tel" id="emergencyContact" class="form-control" placeholder="XXXXXXXXXX" required style="flex: 1;">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="role">I am a</label>
            <select id="role" class="form-control" required>
              <option value="tourist">Tourist</option>
              <option value="authority">Authority / Police</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:.25rem;">
            Create account
          </button>
        </form>

        <p class="auth-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </p>
      </div>
    </div>
  `;
}
