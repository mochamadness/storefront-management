const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'MANAGER', 'CASHIER'),
    allowNull: false,
    defaultValue: 'CASHIER'
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      canViewProducts: true,
      canAddProducts: false,
      canEditProducts: false,
      canDeleteProducts: false,
      canViewUsers: false,
      canAddUsers: false,
      canEditUsers: false,
      canDeleteUsers: false,
      canProcessSales: true,
      canViewTransactions: false,
      canViewReports: false
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true, // Enables soft delete
  indexes: [
    {
      unique: true,
      fields: ['username']
    },
    {
      unique: true,
      fields: ['email']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Class methods
User.getDefaultPermissions = (role) => {
  const permissions = {
    ADMIN: {
      canViewProducts: true,
      canAddProducts: true,
      canEditProducts: true,
      canDeleteProducts: true,
      canViewUsers: true,
      canAddUsers: true,
      canEditUsers: true,
      canDeleteUsers: true,
      canProcessSales: true,
      canViewTransactions: true,
      canViewReports: true
    },
    MANAGER: {
      canViewProducts: true,
      canAddProducts: true,
      canEditProducts: true,
      canDeleteProducts: false,
      canViewUsers: true,
      canAddUsers: false,
      canEditUsers: false,
      canDeleteUsers: false,
      canProcessSales: true,
      canViewTransactions: true,
      canViewReports: true
    },
    CASHIER: {
      canViewProducts: true,
      canAddProducts: false,
      canEditProducts: false,
      canDeleteProducts: false,
      canViewUsers: false,
      canAddUsers: false,
      canEditUsers: false,
      canDeleteUsers: false,
      canProcessSales: true,
      canViewTransactions: false,
      canViewReports: false
    }
  };
  
  return permissions[role] || permissions.CASHIER;
};

module.exports = User;