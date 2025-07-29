const { User } = require('../models');

const createAdmin = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@storefront.com',
      password: 'admin123', // This will be hashed by the model hook
      role: 'ADMIN',
      permissions: User.getDefaultPermissions('ADMIN')
    });

    console.log('Admin user created successfully:');
    console.log('Username: admin');
    console.log('Email: admin@storefront.com');
    console.log('Password: admin123');
    console.log('Role: ADMIN');
    console.log('Please change the default password after first login!');

    // Create some sample users for testing
    await User.create({
      username: 'manager',
      email: 'manager@storefront.com',
      password: 'manager123',
      role: 'MANAGER',
      permissions: User.getDefaultPermissions('MANAGER')
    });

    await User.create({
      username: 'cashier',
      email: 'cashier@storefront.com',
      password: 'cashier123',
      role: 'CASHIER',
      permissions: User.getDefaultPermissions('CASHIER')
    });

    console.log('Sample users created:');
    console.log('Manager - Username: manager, Password: manager123');
    console.log('Cashier - Username: cashier, Password: cashier123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

module.exports = createAdmin;