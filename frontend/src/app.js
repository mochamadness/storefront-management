// Main application
class StorefrontApp {
    constructor() {
        this.currentUser = null;
        this.activeTab = 'products';
    }

    async init() {
        try {
            // Check if user is already authenticated
            const isAuthenticated = await auth.initialize();
            
            if (isAuthenticated) {
                this.currentUser = auth.getCurrentUser();
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            this.showLogin();
        }

        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.handleLogout();
        });

        // Navigation tabs
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                closeModal(modal.id);
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });
    }

    async handleLogin(e) {
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const errorElement = document.getElementById('login-error');

        try {
            errorElement.classList.remove('show');
            
            const response = await auth.login(username, password);
            this.currentUser = response.user;
            
            showNotification('Login successful!', 'success');
            this.showDashboard();
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.classList.add('show');
        }
    }

    async handleLogout() {
        try {
            await auth.logout();
            showNotification('Logged out successfully', 'info');
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local auth state even if API call fails
            auth.clearUser();
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('login-screen').classList.add('active');  
        document.getElementById('dashboard-screen').classList.remove('active');
        
        // Clear login form
        document.getElementById('login-form').reset();
        document.getElementById('login-error').classList.remove('show');
    }

    showDashboard() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        
        this.updateUserInfo();
        this.updateNavigation();
        this.initializeComponents();
    }

    updateUserInfo() {
        document.getElementById('user-name').textContent = this.currentUser.username;
        const roleElement = document.getElementById('user-role');
        roleElement.textContent = this.currentUser.role;
        roleElement.className = `role-badge ${this.currentUser.role}`;
    }

    updateNavigation() {
        // Show/hide navigation items based on permissions
        const usersTab = document.querySelector('[data-tab="users"]');
        const transactionsTab = document.querySelector('[data-tab="transactions"]');

        // Users tab - only for admins who can view users
        if (auth.hasPermission('canViewUsers')) {
            usersTab.style.display = 'block';
        } else {
            usersTab.style.display = 'none';
        }

        // Transactions tab - for managers and admins
        if (auth.hasPermission('canViewTransactions')) {
            transactionsTab.style.display = 'block';
        } else {
            transactionsTab.style.display = 'none';
        }
    }

    async initializeComponents() {
        try {
            // Initialize all components
            await productsComponent.init();
            await salesComponent.init();
            
            if (auth.hasPermission('canViewUsers')) {
                await usersComponent.init();
            }
            
            if (auth.hasPermission('canViewTransactions')) {
                await transactionsComponent.init();
            }

            // Switch to default tab
            this.switchTab('products');
        } catch (error) {
            console.error('Error initializing components:', error);
            showNotification('Error loading dashboard components', 'error');
        }
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.activeTab = tabName;
    }
}

// Global utility functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new StorefrontApp();
    app.init();
    
    // Make app globally accessible for debugging
    window.app = app;
});