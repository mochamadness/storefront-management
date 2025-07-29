const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User, Transaction } = require('../models');
const { authMiddleware, requirePermission, requireRole } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (requires canViewUsers permission or ADMIN role)
router.get('/', requirePermission('canViewUsers'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    const { rows: users, count } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      attributes: { exclude: ['password'] }
    });

    res.json({
      users,
      totalUsers: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private (requires canViewUsers permission or ADMIN role)
router.get('/:id', requirePermission('canViewUsers'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Transaction,
          as: 'transactions',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (requires canAddUsers permission or ADMIN role)
router.post('/', requirePermission('canAddUsers'), [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['ADMIN', 'MANAGER', 'CASHIER'])
    .withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this username or email' 
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role,
      permissions: User.getDefaultPermissions(role)
    });

    // Log user creation
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'USER_CREATE',
      description: `User created: ${username} (${role}) by ${req.user.username}`,
      metadata: { 
        createdUserId: user.id,
        role, 
        email,
        createdBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (requires canEditUsers permission or ADMIN role)
router.put('/:id', requirePermission('canEditUsers'), [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'MANAGER', 'CASHIER'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, email, role, isActive, permissions } = req.body;
    const updates = {};

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      updates.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updates.email = email;
    }

    if (role && role !== user.role) {
      updates.role = role;
      updates.permissions = User.getDefaultPermissions(role);
    }

    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    // Allow custom permissions for admins
    if (permissions && req.user.role === 'ADMIN') {
      updates.permissions = { ...updates.permissions, ...permissions };
    }

    await user.update(updates);

    // Log user update
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'USER_UPDATE',
      description: `User updated: ${user.username} by ${req.user.username}`,
      metadata: { 
        updatedUserId: user.id,
        updates,
        updatedBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Soft delete user
// @access  Private (requires canDeleteUsers permission or ADMIN role)
router.delete('/:id', requirePermission('canDeleteUsers'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.destroy(); // Soft delete

    // Log user deletion
    await Transaction.logTransaction({
      userId: req.user.id,
      transactionType: 'USER_DELETE',
      description: `User deleted: ${user.username} by ${req.user.username}`,
      metadata: { 
        deletedUserId: user.id,
        deletedUsername: user.username,
        deletedBy: req.user.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;