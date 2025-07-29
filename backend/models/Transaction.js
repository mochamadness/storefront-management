const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  transactionType: {
    type: DataTypes.ENUM(
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
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    get() {
      const value = this.getDataValue('amount');
      return value ? parseFloat(value) : null;
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  updatedAt: false, // Transactions should not be updatable
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['transactionType']
    },
    {
      fields: ['productId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['userId', 'transactionType']
    }
  ]
});

// Class methods
Transaction.logTransaction = async function(data) {
  try {
    return await this.create({
      userId: data.userId,
      transactionType: data.transactionType,
      description: data.description,
      amount: data.amount || null,
      productId: data.productId || null,
      quantity: data.quantity || null,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
    throw error;
  }
};

Transaction.getTransactionsByUser = function(userId, options = {}) {
  return this.findAll({
    where: {
      userId,
      ...options.where
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

Transaction.getTransactionsByType = function(transactionType, options = {}) {
  return this.findAll({
    where: {
      transactionType,
      ...options.where
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

Transaction.getTransactionsByProduct = function(productId, options = {}) {
  return this.findAll({
    where: {
      productId,
      ...options.where
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

Transaction.getSalesReport = function(startDate, endDate) {
  return this.findAll({
    where: {
      transactionType: 'SALE',
      createdAt: {
        [sequelize.Op.between]: [startDate, endDate]
      }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalSales'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions']
    ],
    raw: true
  });
};

module.exports = Transaction;