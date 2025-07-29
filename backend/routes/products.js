const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Product, Transaction } = require('../models');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/products
// @desc    Get all products
// @access  Private (requires canViewProducts permission)
router.get('/', requirePermission('canViewProducts'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      includeInactive = false
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (!includeInactive || includeInactive === 'false') {
      whereClause.isActive = true;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    const { rows: products, count } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      products,
      totalProducts: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/low-stock
// @desc    Get low stock products
// @access  Private (requires canViewProducts permission)
router.get('/low-stock', requirePermission('canViewProducts'), async (req, res) => {
  try {
    const products = await Product.findLowStockProducts();
    res.json(products);
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private (requires canViewProducts permission)
router.get('/:id', requirePermission('canViewProducts'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Transaction,
          as: 'transactions',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (requires canAddProducts permission)
router.post('/', requirePermission('canAddProducts'), [
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name is required and must be less than 255 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stockQuantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('sku')
    .optional()
    .isLength({ max: 100 })
    .withMessage('SKU must be less than 100 characters'),
  body('minStockLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock level must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, stockQuantity, sku, category, supplier, minStockLevel } = req.body;

    // Check if SKU already exists
    if (sku) {
      const existingProduct = await Product.findOne({ where: { sku } });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product with this SKU already exists' });
      }
    }

    const product = await Product.create({
      name,
      description,
      price,
      stockQuantity,
      sku,
      category,
      supplier,
      minStockLevel: minStockLevel || 10
    });

    // Log product creation
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'PRODUCT_ADD',
      description: `Product added: ${name} (ID: ${product.id})`,
      productId: product.id,
      quantity: stockQuantity,
      metadata: {
        price,
        sku,
        category,
        supplier,
        addedBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (requires canEditProducts permission)
router.put('/:id', requirePermission('canEditProducts'), [
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name must be less than 255 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('sku')
    .optional()
    .isLength({ max: 100 })
    .withMessage('SKU must be less than 100 characters'),
  body('minStockLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock level must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, description, price, stockQuantity, sku, category, supplier, minStockLevel, isActive } = req.body;
    const updates = {};
    const oldValues = { ...product.dataValues };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
    if (sku !== undefined && sku !== product.sku) {
      // Check if new SKU already exists
      const existingProduct = await Product.findOne({ where: { sku } });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product with this SKU already exists' });
      }
      updates.sku = sku;
    }
    if (category !== undefined) updates.category = category;
    if (supplier !== undefined) updates.supplier = supplier;
    if (minStockLevel !== undefined) updates.minStockLevel = minStockLevel;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    await product.update(updates);

    // Log product update
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'PRODUCT_UPDATE',
      description: `Product updated: ${product.name} (ID: ${product.id})`,
      productId: product.id,
      metadata: {
        oldValues,
        newValues: updates,
        updatedBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private (requires canEditProducts permission)
router.put('/:id/stock', requirePermission('canEditProducts'), [
  body('quantity')
    .isInt()
    .withMessage('Quantity must be an integer'),
  body('operation')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operation must be add, subtract, or set')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { quantity, operation } = req.body;
    const oldStock = product.stockQuantity;

    await product.updateStock(quantity, operation);

    // Log stock update
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'STOCK_UPDATE',
      description: `Stock updated for ${product.name}: ${oldStock} → ${product.stockQuantity} (${operation} ${quantity})`,
      productId: product.id,
      quantity: operation === 'set' ? quantity : (operation === 'add' ? quantity : -quantity),
      metadata: {
        operation,
        oldStock,
        newStock: product.stockQuantity,
        quantityChanged: quantity,
        updatedBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Stock updated successfully',
      product
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Soft delete product
// @access  Private (requires canDeleteProducts permission)
router.delete('/:id', requirePermission('canDeleteProducts'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.destroy(); // Soft delete

    // Log product deletion
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'PRODUCT_DELETE',
      description: `Product deleted: ${product.name} (ID: ${product.id})`,
      productId: product.id,
      metadata: {
        productName: product.name,
        sku: product.sku,
        stockAtDeletion: product.stockQuantity,
        deletedBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;