const User = require('./User');
const Product = require('./Product');
const Transaction = require('./Transaction');

// Define associations
User.hasMany(Transaction, {
  foreignKey: 'userId',
  as: 'transactions'
});

Product.hasMany(Transaction, {
  foreignKey: 'productId',
  as: 'transactions'
});

Transaction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Transaction.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

module.exports = {
  User,
  Product,
  Transaction
};