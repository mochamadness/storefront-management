// Sales processing component
const salesComponent = {
    cart: [],
    productSuggestions: [],
    taxRate: 0.08, // 8% tax

    async init() {
        this.bindEvents();
        this.updateCart();
    },

    bindEvents() {
        // Product search
        document.getElementById('sale-product-search').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.product-search')) {
                this.hideSuggestions();
            }
        });

        // Cart actions
        document.getElementById('clear-cart').addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('process-sale').addEventListener('click', () => {
            this.processSale();
        });
    },

    async searchProducts(query) {
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        try {
            const response = await api.getProducts({
                search: query,
                limit: 10,
                includeInactive: false
            });

            this.productSuggestions = response.products.filter(p => p.stockQuantity > 0);
            this.showSuggestions();
        } catch (error) {
            console.error('Error searching products:', error);
            this.hideSuggestions();
        }
    },

    showSuggestions() {
        const container = document.getElementById('product-suggestions');
        container.innerHTML = '';

        if (this.productSuggestions.length === 0) {
            container.innerHTML = '<div class="suggestion-item">No products found</div>';
        } else {
            this.productSuggestions.forEach(product => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <strong>${this.escapeHtml(product.name)}</strong><br>
                    <small>Price: $${product.price.toFixed(2)} | Stock: ${product.stockQuantity}</small>
                `;
                item.addEventListener('click', () => {
                    this.addToCart(product);
                    this.hideSuggestions();
                    document.getElementById('sale-product-search').value = '';
                });
                container.appendChild(item);
            });
        }

        container.classList.add('show');
    },

    hideSuggestions() {
        document.getElementById('product-suggestions').classList.remove('show');
    },

    addToCart(product) {
        const existingItem = this.cart.find(item => item.productId === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stockQuantity) {
                existingItem.quantity++;
            } else {
                showNotification('Insufficient stock available', 'error');
                return;
            }
        } else {
            this.cart.push({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: 1,
                maxStock: product.stockQuantity
            });
        }

        this.updateCart();
        showNotification(`${product.name} added to cart`, 'success');
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.updateCart();
    },

    updateQuantity(productId, newQuantity) {
        const item = this.cart.find(item => item.productId === productId);
        if (!item) return;

        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        if (newQuantity > item.maxStock) {
            showNotification('Quantity exceeds available stock', 'error');
            return;
        }

        item.quantity = newQuantity;
        this.updateCart();
    },

    updateCart() {
        this.renderCart();
        this.updateTotals();
    },

    renderCart() {
        const tbody = document.getElementById('cart-tbody');
        tbody.innerHTML = '';

        if (this.cart.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Cart is empty</td>
                </tr>
            `;
            return;
        }

        this.cart.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(item.productName)}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxStock}" 
                           style="width: 80px;" 
                           onchange="salesComponent.updateQuantity(${item.productId}, parseInt(this.value))">
                </td>
                <td>$${(item.price * item.quantity).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" 
                            onclick="salesComponent.removeFromCart(${item.productId})">
                        Remove
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    updateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.taxRate;
        const total = subtotal + tax;

        document.getElementById('subtotal').textContent = subtotal.toFixed(2);
        document.getElementById('tax').textContent = tax.toFixed(2);
        document.getElementById('total').textContent = total.toFixed(2);

        // Enable/disable process sale button
        document.getElementById('process-sale').disabled = this.cart.length === 0;
    },

    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('Are you sure you want to clear the cart?')) {
            this.cart = [];
            this.updateCart();
            showNotification('Cart cleared', 'info');
        }
    },

    async processSale() {
        if (this.cart.length === 0) {
            showNotification('Cart is empty', 'error');
            return;
        }

        try {
            const saleData = {
                items: this.cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                })),
                taxRate: this.taxRate,
                discount: 0,
                paymentMethod: 'CASH'
            };

            const response = await api.processSale(saleData);
            
            // Show sale summary
            this.showSaleSummary(response.sale);
            
            // Clear cart
            this.cart = [];
            this.updateCart();
            
            showNotification('Sale processed successfully!', 'success');
        } catch (error) {
            showNotification('Error processing sale: ' + error.message, 'error');
        }
    },

    showSaleSummary(sale) {
        const summary = `
Sale Summary:
Sale ID: ${sale.saleId}
Items: ${sale.items.length}
Subtotal: $${sale.subtotal.toFixed(2)}
Tax: $${sale.taxAmount.toFixed(2)}
Total: $${sale.total.toFixed(2)}
Payment: ${sale.paymentMethod}
Cashier: ${sale.cashier}
        `;
        
        alert(summary);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in main app
window.salesComponent = salesComponent;