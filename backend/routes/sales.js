const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Product, Transaction, User } = require('../models');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   POST /api/sales
// @desc    Process a sale
// @access  Private (requires canProcessSales permission)
router.post('/', requirePermission('canProcessSales'), [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required and must contain at least one item'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('Each item must have a valid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item must have a valid quantity'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Tax rate must be between 0 and 1'),
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, taxRate = 0, discount = 0, paymentMethod = 'CASH' } = req.body;

    // Start a transaction to ensure data consistency
    const t = await Product.sequelize.transaction();

    try {
      let subtotal = 0;
      const saleItems = [];
      const stockUpdates = [];

      // Validate and calculate each item
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        
        if (!product) {
          await t.rollback();
          return res.status(404).json({ 
            message: `Product with ID ${item.productId} not found` 
          });
        }

        if (!product.isActive) {
          await t.rollback();
          return res.status(400).json({ 
            message: `Product ${product.name} is not available for sale` 
          });
        }

        if (product.stockQuantity < item.quantity) {
          await t.rollback();
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` 
          });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
          itemTotal
        });

        stockUpdates.push({
          product,
          quantity: item.quantity
        });
      }

      // Calculate totals
      const discountAmount = discount;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * taxRate;
      const total = taxableAmount + taxAmount;

      // Update stock for all items
      for (const update of stockUpdates) {
        await update.product.updateStock(update.quantity, 'subtract');
      }

      // Log individual transactions for each item
      const transactionPromises = saleItems.map(item => 
        Transaction.logTransaction({
          userId: req.user.id,
          transactionType: 'SALE',
          description: `Sale: ${item.quantity}x ${item.productName} @ $${item.price.toFixed(2)}`,
          amount: item.itemTotal,
          productId: item.productId,
          quantity: item.quantity,
          metadata: {
            saleId: `SALE_${Date.now()}_${req.user.id}`,
            productName: item.productName,
            unitPrice: item.price,
            paymentMethod,
            cashier: req.user.username,
            subtotal,
            discount: discountAmount,
            taxRate,
            taxAmount,
            total
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        })
      );

      await Promise.all(transactionPromises);

      await t.commit();

      res.json({
        message: 'Sale processed successfully',
        sale: {
          saleId: `SALE_${Date.now()}_${req.user.id}`,
          items: saleItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount: parseFloat(discountAmount.toFixed(2)),
          taxRate: parseFloat(taxRate.toFixed(4)),
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          paymentMethod,
          cashier: req.user.username,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      await t.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Process sale error:', error);
    res.status(500).json({ message: 'Server error processing sale' });
  }
});

// @route   GET /api/sales/history
// @desc    Get sales history
// @access  Private (requires canViewTransactions permission)
router.get('/history', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate,
      cashier,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      transactionType: 'SALE'
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    if (cashier) {
      const user = await User.findOne({ where: { username: cashier } });
      if (user) {
        whereClause.userId = user.id;
      }
    }

    const { rows: sales, count } = await Transaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ]
    });

    res.json({
      sales,
      totalSales: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Get sales history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/reports/daily
// @desc    Get daily sales report
// @access  Private (requires canViewReports permission)
router.get('/reports/daily', requirePermission('canViewReports'), async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const salesData = await Transaction.findAll({
      where: {
        transactionType: 'SALE',
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'totalSales'],
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('quantity')), 'totalQuantity'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'totalTransactions']
      ],
      raw: true
    });

    const topProducts = await Transaction.findAll({
      where: {
        transactionType: 'SALE',
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'productId',
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('quantity')), 'totalQuantity'],
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'totalAmount']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name', 'price']
        }
      ],
      group: ['productId'],
      order: [[Transaction.sequelize.fn('SUM', Transaction.sequelize.col('quantity')), 'DESC']],
      limit: 10
    });

    res.json({
      date,
      summary: {
        totalSales: parseFloat(salesData[0].totalSales || 0),
        totalQuantity: parseInt(salesData[0].totalQuantity || 0),
        totalTransactions: parseInt(salesData[0].totalTransactions || 0)
      },
      topProducts
    });

  } catch (error) {
    console.error('Get daily sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/reports/period
// @desc    Get sales report for a period
// @access  Private (requires canViewReports permission)
router.get('/reports/period', requirePermission('canViewReports'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const salesData = await Transaction.getSalesReport(start, end);

    const dailySales = await Transaction.findAll({
      where: {
        transactionType: 'SALE',
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        [Transaction.sequelize.fn('DATE', Transaction.sequelize.col('createdAt')), 'date'],
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'totalSales'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'totalTransactions']
      ],
      group: [Transaction.sequelize.fn('DATE', Transaction.sequelize.col('createdAt'))],
      order: [[Transaction.sequelize.fn('DATE', Transaction.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSales: parseFloat(salesData[0]?.totalSales || 0),
        totalQuantity: parseInt(salesData[0]?.totalQuantity || 0),
        totalTransactions: parseInt(salesData[0]?.totalTransactions || 0)
      },
      dailyBreakdown: dailySales
    });

  } catch (error) {
    console.error('Get period sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;