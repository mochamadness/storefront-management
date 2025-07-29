// Products management component
const productsComponent = {
    currentPage: 1,
    totalPages: 1,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    searchTerm: '',
    selectedCategory: '',
    editingProduct: null,

    async init() {
        this.bindEvents();
        await this.loadProducts();
        this.updatePermissions();
    },

    bindEvents() {
        // Add product button
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductModal();
        });

        // Product form submission
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSubmit();
        });

        // Search input
        document.getElementById('product-search').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.currentPage = 1;
            this.debounceLoadProducts();
        });

        // Category filter
        document.getElementById('product-category').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Pagination
        document.getElementById('prev-products').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadProducts();
            }
        });

        document.getElementById('next-products').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadProducts();
            }
        });

        // Table sorting
        document.querySelectorAll('#products-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sortField = th.getAttribute('data-sort');
                if (this.sortBy === sortField) {
                    this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    this.sortBy = sortField;
                    this.sortOrder = 'ASC';
                }
                this.updateSortIndicators();
                this.loadProducts();
            });
        });
    },

    updatePermissions() {
        const addBtn = document.getElementById('add-product-btn');
        if (!auth.hasPermission('canAddProducts')) {
            addBtn.style.display = 'none';
        }
    },

    updateSortIndicators() {
        document.querySelectorAll('#products-table th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.getAttribute('data-sort') === this.sortBy) {
                th.classList.add(this.sortOrder === 'ASC' ? 'sort-asc' : 'sort-desc');
            }
        });
    },

    debounceLoadProducts() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadProducts();
        }, 300);
    },

    async loadProducts() {
        try {
            const params = {
                page: this.currentPage,
                limit: 10,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            };

            if (this.searchTerm) {
                params.search = this.searchTerm;
            }

            if (this.selectedCategory) {
                params.category = this.selectedCategory;
            }

            const response = await api.getProducts(params);
            this.renderProducts(response.products);
            this.updatePagination(response.currentPage, response.totalPages);
            this.totalPages = response.totalPages;

            // Update category filter options
            this.updateCategoryOptions(response.products);
        } catch (error) {
            showNotification('Error loading products: ' + error.message, 'error');
        }
    },

    renderProducts(products) {
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No products found</td>
                </tr>
            `;
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(product.name)}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>
                    <span class="${product.stockQuantity <= product.minStockLevel ? 'text-danger' : 'text-success'}">
                        ${product.stockQuantity}
                    </span>
                </td>
                <td>${this.escapeHtml(product.category || '-')}</td>
                <td>
                    ${auth.hasPermission('canEditProducts') ? 
                        `<button class="btn btn-sm btn-secondary" onclick="productsComponent.editProduct(${product.id})">Edit</button>` : ''
                    }
                    ${auth.hasPermission('canEditProducts') ? 
                        `<button class="btn btn-sm btn-secondary" onclick="productsComponent.updateStock(${product.id})">Stock</button>` : ''
                    }
                    ${auth.hasPermission('canDeleteProducts') ? 
                        `<button class="btn btn-sm btn-danger" onclick="productsComponent.deleteProduct(${product.id})">Delete</button>` : ''
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    updateCategoryOptions(products) {
        const categorySet = new Set();
        products.forEach(product => {
            if (product.category) {
                categorySet.add(product.category);
            }
        });

        const select = document.getElementById('product-category');
        // Keep the "All Categories" option
        const currentOptions = Array.from(select.options).slice(1);
        currentOptions.forEach(option => {
            if (!categorySet.has(option.value)) {
                select.removeChild(option);
            }
        });

        categorySet.forEach(category => {
            if (!Array.from(select.options).some(option => option.value === category)) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            }
        });
    },

    updatePagination(currentPage, totalPages) {
        document.getElementById('products-page-info').textContent = 
            `Page ${currentPage} of ${totalPages}`;
        
        document.getElementById('prev-products').disabled = currentPage <= 1;
        document.getElementById('next-products').disabled = currentPage >= totalPages;
    },

    openProductModal(product = null) {
        this.editingProduct = product;
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');

        title.textContent = product ? 'Edit Product' : 'Add Product';
        
        if (product) {
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stockQuantity;
            document.getElementById('product-sku').value = product.sku || '';
            document.getElementById('product-category').value = product.category || '';
        } else {
            form.reset();
        }

        modal.classList.add('show');
    },

    async handleProductSubmit() {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData);

        // Convert numeric fields
        productData.price = parseFloat(productData.price);
        productData.stockQuantity = parseInt(productData.stockQuantity);

        try {
            if (this.editingProduct) {
                await api.updateProduct(this.editingProduct.id, productData);
                showNotification('Product updated successfully', 'success');
            } else {
                await api.createProduct(productData);
                showNotification('Product created successfully', 'success');
            }

            closeModal('product-modal');
            await this.loadProducts();
        } catch (error) {
            showNotification('Error saving product: ' + error.message, 'error');
        }
    },

    async editProduct(id) {
        try {
            const product = await api.getProduct(id);
            this.openProductModal(product);
        } catch (error) {
            showNotification('Error loading product: ' + error.message, 'error');
        }
    },

    async updateStock(id) {
        const quantity = prompt('Enter stock quantity to add/subtract:');
        if (quantity === null) return;

        const operation = prompt('Enter operation (add/subtract/set):', 'add');
        if (!['add', 'subtract', 'set'].includes(operation)) {
            showNotification('Invalid operation. Use add, subtract, or set', 'error');
            return;
        }

        try {
            await api.updateProductStock(id, parseInt(quantity), operation);
            showNotification('Stock updated successfully', 'success');
            await this.loadProducts();
        } catch (error) {
            showNotification('Error updating stock: ' + error.message, 'error');
        }
    },

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await api.deleteProduct(id);
            showNotification('Product deleted successfully', 'success');
            await this.loadProducts();
        } catch (error) {
            showNotification('Error deleting product: ' + error.message, 'error');
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in main app
window.productsComponent = productsComponent;