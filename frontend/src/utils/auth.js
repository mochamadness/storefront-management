// Authentication utilities
const auth = {
    // Get current user from localStorage
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set user and token in localStorage
    setUser(user, token) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
    },

    // Remove user and token from localStorage
    clearUser() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Check if user has specific permission
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // Admin has all permissions
        if (user.role === 'ADMIN') return true;
        
        return user.permissions && user.permissions[permission];
    },

    // Check if user has specific role
    hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        
        return user.role === role;
    },

    // Get user role
    getRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    },

    // Login function
    async login(username, password) {
        try {
            const response = await api.login(username, password);
            this.setUser(response.user, response.token);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Logout function
    async logout() {
        try {
            if (this.isAuthenticated()) {
                await api.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearUser();
        }
    },

    // Initialize authentication state
    async initialize() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            // Verify token is still valid
            const user = await api.getCurrentUser();
            this.setUser(user, localStorage.getItem('token'));
            return true;
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.clearUser();
            return false;
        }
    }
};

// Export for use in other files
window.auth = auth;