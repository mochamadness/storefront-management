const express = require('express');
const { Op } = require('sequelize');
const { Transaction, User, Product } = require('../models');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private (requires canViewTransactions permission)
router.get('/', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      userId, 
      productId, 
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (type) {
      whereClause.transactionType = type;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (productId) {
      whereClause.productId = productId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price'],
          required: false
        }
      ]
    });

    res.json({
      transactions,
      totalTransactions: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/types
// @desc    Get all transaction types
// @access  Private (requires canViewTransactions permission)
router.get('/types', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const types = [
      'PRODUCT_ADD',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      'STOCK_UPDATE',
      'SALE',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'LOGIN',
      'LOGOUT'
    ];

    res.json(types);
  } catch (error) {
    console.error('Get transaction types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private (requires canViewTransactions permission)
router.get('/:id', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'sku'],
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/user/:userId
// @desc    Get transactions by user
// @access  Private (requires canViewTransactions permission)
router.get('/user/:userId', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.params.userId };
    if (type) {
      whereClause.transactionType = type;
    }

    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price'],
          required: false
        }
      ]
    });

    res.json({
      transactions,
      totalTransactions: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/product/:productId
// @desc    Get transactions by product
// @access  Private (requires canViewTransactions permission)
router.get('/product/:productId', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { productId: req.params.productId };
    if (type) {
      whereClause.transactionType = type;
    }

    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price']
        }
      ]
    });

    res.json({
      transactions,
      totalTransactions: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Get product transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction statistics summary
// @access  Private (requires canViewTransactions permission)
router.get('/stats/summary', requirePermission('canViewTransactions'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Get transaction counts by type
    const transactionsByType = await Transaction.findAll({
      where: whereClause,
      attributes: [
        'transactionType',
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
      ],
      group: ['transactionType'],
      raw: true
    });

    // Get daily transaction counts
    const dailyTransactions = await Transaction.findAll({
      where: whereClause,
      attributes: [
        [Transaction.sequelize.fn('DATE', Transaction.sequelize.col('createdAt')), 'date'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
      ],
      group: [Transaction.sequelize.fn('DATE', Transaction.sequelize.col('createdAt'))],
      order: [[Transaction.sequelize.fn('DATE', Transaction.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Get most active users
    const activeUsers = await Transaction.findAll({
      where: whereClause,
      attributes: [
        'userId',
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('Transaction.id')), 'transactionCount']
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'role']
        }
      ],
      group: ['userId', 'user.id'],
      order: [[Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('Transaction.id')), 'DESC']],
      limit: 10
    });

    res.json({
      transactionsByType,
      dailyTransactions,
      activeUsers
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;