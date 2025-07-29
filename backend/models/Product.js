const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    get() {
      const value = this.getDataValue('price');
      return value ? parseFloat(value) : 0;
    }
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: true
  },
  minStockLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true,
  paranoid: true, // Enables soft delete with deletedAt
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['category']
    },
    {
      fields: ['isActive']
    },
    {
      unique: true,
      fields: ['sku'],
      where: {
        deletedAt: null
      }
    }
  ]
});

// Instance methods
Product.prototype.isInStock = function() {
  return this.stockQuantity > 0;
};

Product.prototype.isLowStock = function() {
  return this.stockQuantity <= this.minStockLevel;
};

Product.prototype.updateStock = function(quantity, operation = 'add') {
  if (operation === 'add') {
    this.stockQuantity += quantity;
  } else if (operation === 'subtract') {
    this.stockQuantity = Math.max(0, this.stockQuantity - quantity);
  } else if (operation === 'set') {
    this.stockQuantity = Math.max(0, quantity);
  }
  return this.save();
};

// Class methods
Product.findActiveProducts = function(options = {}) {
  return this.findAll({
    where: {
      isActive: true,
      ...options.where
    },
    ...options
  });
};

Product.findLowStockProducts = function() {
  return this.findAll({
    where: sequelize.where(
      sequelize.col('stockQuantity'),
      '<=',
      sequelize.col('minStockLevel')
    )
  });
};

module.exports = Product;