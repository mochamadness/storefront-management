// Transactions/audit log component
const transactionsComponent = {
    currentPage: 1,
    totalPages: 1,
    selectedType: '',
    selectedDate: '',

    async init() {
        this.bindEvents();
        await this.loadTransactionTypes();
        await this.loadTransactions();
        this.updatePermissions();
    },

    bindEvents() {
        // Transaction type filter
        document.getElementById('transaction-type').addEventListener('change', (e) => {
            this.selectedType = e.target.value;
            this.currentPage = 1;
            this.loadTransactions();
        });

        // Date filter
        document.getElementById('transaction-date').addEventListener('change', (e) => {
            this.selectedDate = e.target.value;
            this.currentPage = 1;
            this.loadTransactions();
        });
    },

    updatePermissions() {
        const transactionsTab = document.querySelector('[data-tab="transactions"]');
        
        if (!auth.hasPermission('canViewTransactions')) {
            transactionsTab.style.display = 'none';
            return;
        }

        // Show for managers and admins
        if (auth.hasRole(['ADMIN', 'MANAGER'])) {
            transactionsTab.classList.add('show');
        }
    },

    async loadTransactionTypes() {
        try {
            const types = await api.getTransactionTypes();
            const select = document.getElementById('transaction-type');
            
            // Clear existing options (except "All Types")
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = this.formatTransactionType(type);
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading transaction types:', error);
        }
    },

    async loadTransactions() {
        if (!auth.hasPermission('canViewTransactions')) {
            return;
        }

        try {
            const params = {
                page: this.currentPage,
                limit: 20,
                sortBy: 'createdAt',
                sortOrder: 'DESC'
            };

            if (this.selectedType) {
                params.type = this.selectedType;
            }

            if (this.selectedDate) {
                params.startDate = this.selectedDate;
                params.endDate = this.selectedDate;
            }

            const response = await api.getTransactions(params);
            this.renderTransactions(response.transactions);
            this.updatePagination(response.currentPage, response.totalPages);
            this.totalPages = response.totalPages;
        } catch (error) {
            showNotification('Error loading transactions: ' + error.message, 'error');
        }
    },

    renderTransactions(transactions) {
        const tbody = document.getElementById('transactions-tbody');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No transactions found</td>
                </tr>
            `;
            return;
        }

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const date = new Date(transaction.createdAt).toLocaleString();
            const amount = transaction.amount ? `$${transaction.amount.toFixed(2)}` : '-';
            const userName = transaction.user ? transaction.user.username : 'System';

            row.innerHTML = `
                <td>${date}</td>
                <td>
                    <span class="badge ${this.getTransactionTypeClass(transaction.transactionType)}">
                        ${this.formatTransactionType(transaction.transactionType)}
                    </span>
                </td>
                <td>${this.escapeHtml(userName)}</td>
                <td>${this.escapeHtml(transaction.description)}</td>
                <td class="${transaction.amount ? 'text-success' : ''}">${amount}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updatePagination(currentPage, totalPages) {
        // Note: This is a simplified pagination display
        console.log(`Transactions page ${currentPage} of ${totalPages}`);
    },

    formatTransactionType(type) {
        const typeMap = {
            'PRODUCT_ADD': 'Product Added',
            'PRODUCT_UPDATE': 'Product Updated',
            'PRODUCT_DELETE': 'Product Deleted',
            'STOCK_UPDATE': 'Stock Updated',
            'SALE': 'Sale',
            'USER_CREATE': 'User Created',
            'USER_UPDATE': 'User Updated',
            'USER_DELETE': 'User Deleted',
            'LOGIN': 'Login',
            'LOGOUT': 'Logout'
        };

        return typeMap[type] || type;
    },

    getTransactionTypeClass(type) {
        const classMap = {
            'SALE': 'active',
            'PRODUCT_ADD': 'active',
            'PRODUCT_UPDATE': '',
            'PRODUCT_DELETE': 'inactive',
            'STOCK_UPDATE': '',
            'USER_CREATE': 'active',
            'USER_UPDATE': '',
            'USER_DELETE': 'inactive',
            'LOGIN': 'active',
            'LOGOUT': ''
        };

        return classMap[type] || '';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in main app
window.transactionsComponent = transactionsComponent;