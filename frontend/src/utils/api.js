// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Utility Functions
const api = {
    // Helper to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    // Generic API request function
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Authentication
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    },

    async getCurrentUser() {
        return this.request('/auth/me');
    },

    // Products
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/products?${queryString}`);
    },

    async getProduct(id) {
        return this.request(`/products/${id}`);
    },

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    },

    async updateProduct(id, productData) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    },

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    },

    async updateProductStock(id, quantity, operation) {
        return this.request(`/products/${id}/stock`, {
            method: 'PUT',
            body: JSON.stringify({ quantity, operation })
        });
    },

    async getLowStockProducts() {
        return this.request('/products/low-stock');
    },

    // Sales
    async processSale(saleData) {
        return this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    },

    async getSalesHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/sales/history?${queryString}`);
    },

    async getDailySalesReport(date) {
        return this.request(`/sales/reports/daily?date=${date}`);
    },

    async getPeriodSalesReport(startDate, endDate) {
        return this.request(`/sales/reports/period?startDate=${startDate}&endDate=${endDate}`);
    },

    // Users
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/users?${queryString}`);
    },

    async getUser(id) {
        return this.request(`/users/${id}`);
    },

    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    },

    // Transactions
    async getTransactions(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/transactions?${queryString}`);
    },

    async getTransaction(id) {
        return this.request(`/transactions/${id}`);
    },

    async getTransactionTypes() {
        return this.request('/transactions/types');
    },

    async getTransactionStats(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/transactions/stats/summary?${queryString}`);
    },

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
};

// Export for use in other files
window.api = api;