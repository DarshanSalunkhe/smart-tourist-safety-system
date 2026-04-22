class AuthService {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  }

  register(userData) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    const user = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString(),
      blockchainId: this.generateBlockchainId(),
      verified: true
    };
    
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
    
    return user;
  }

  login(email, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      this.currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    }
    
    return null;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('user');
    
    // Clear any session data
    sessionStorage.clear();
    
    // Redirect to login
    window.location.hash = '#/login';
    
    // Force reload to clear state
    setTimeout(() => window.location.reload(), 100);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  generateBlockchainId() {
    return 'BLK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
}

export const authService = new AuthService();
