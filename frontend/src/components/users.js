// Users management component
const usersComponent = {
    currentPage: 1,
    totalPages: 1,
    editingUser: null,

    async init() {
        this.bindEvents();
        await this.loadUsers();
        this.updatePermissions();
    },

    bindEvents() {
        // Add user button
        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.openUserModal();
        });

        // User form submission
        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });
    },

    updatePermissions() {
        const addBtn = document.getElementById('add-user-btn');
        const usersTab = document.querySelector('[data-tab="users"]');
        
        if (!auth.hasPermission('canViewUsers')) {
            usersTab.style.display = 'none';
            return;
        }

        if (!auth.hasPermission('canAddUsers')) {
            addBtn.style.display = 'none';
        }

        usersTab.classList.add('show');
    },

    async loadUsers() {
        if (!auth.hasPermission('canViewUsers')) {
            return;
        }

        try {
            const params = {
                page: this.currentPage,
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'DESC'
            };

            const response = await api.getUsers(params);
            this.renderUsers(response.users);
            this.updatePagination(response.currentPage, response.totalPages);
            this.totalPages = response.totalPages;
        } catch (error) {
            showNotification('Error loading users: ' + error.message, 'error');
        }
    },

    renderUsers(users) {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No users found</td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    <span class="role-badge ${user.role}">${user.role}</span>
                </td>
                <td>
                    <span class="badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    ${auth.hasPermission('canEditUsers') ? 
                        `<button class="btn btn-sm btn-secondary" onclick="usersComponent.editUser(${user.id})">Edit</button>` : ''
                    }
                    ${auth.hasPermission('canDeleteUsers') && user.id !== auth.getCurrentUser().id ? 
                        `<button class="btn btn-sm btn-danger" onclick="usersComponent.deleteUser(${user.id})">Delete</button>` : ''
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    updatePagination(currentPage, totalPages) {
        // Note: This is a simplified pagination - you could add proper pagination controls
        console.log(`Users page ${currentPage} of ${totalPages}`);
    },

    openUserModal(user = null) {
        this.editingUser = user;
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const form = document.getElementById('user-form');
        const passwordField = document.getElementById('user-password');

        title.textContent = user ? 'Edit User' : 'Add User';
        
        if (user) {
            document.getElementById('user-username').value = user.username;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-role').value = user.role;
            
            // Make password optional for editing
            passwordField.required = false;
            passwordField.placeholder = 'Leave blank to keep current password';
        } else {
            form.reset();
            passwordField.required = true;
            passwordField.placeholder = '';
        }

        modal.classList.add('show');
    },

    async handleUserSubmit() {
        const form = document.getElementById('user-form');
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData);

        // Don't send empty password for updates
        if (this.editingUser && !userData.password) {
            delete userData.password;
        }

        try {
            if (this.editingUser) {
                await api.updateUser(this.editingUser.id, userData);
                showNotification('User updated successfully', 'success');
            } else {
                await api.createUser(userData);
                showNotification('User created successfully', 'success');
            }

            closeModal('user-modal');
            await this.loadUsers();
        } catch (error) {
            showNotification('Error saving user: ' + error.message, 'error');
        }
    },

    async editUser(id) {
        try {
            const user = await api.getUser(id);
            this.openUserModal(user);
        } catch (error) {
            showNotification('Error loading user: ' + error.message, 'error');
        }
    },

    async deleteUser(id) {
        const currentUser = auth.getCurrentUser();
        if (id === currentUser.id) {
            showNotification('Cannot delete your own account', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            await api.deleteUser(id);
            showNotification('User deleted successfully', 'success');
            await this.loadUsers();
        } catch (error) {
            showNotification('Error deleting user: ' + error.message, 'error');
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in main app
window.usersComponent = usersComponent;