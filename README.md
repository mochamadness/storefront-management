# Storefront Management System

A comprehensive storefront management system built with Node.js, Express, SQLite, and React.

## Features

- **Multi-user system** with role-based permissions (Admin, Manager, Cashier)
- **Product Management**: Add, edit, soft delete products, and manage stock levels
- **Sales Interface**: Process sales transactions with inventory validation
- **Transaction Logging**: Complete audit trail of all operations
- **User Management**: Create and manage users with granular permissions
- **Data Tables**: Sortable and searchable tables for products, users, and transactions

## Quick Start

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

The backend server will start on port 5000 with SQLite database auto-created.

### Default Users

- **Admin**: username: `admin`, password: `admin123`
- **Manager**: username: `manager`, password: `manager123`  
- **Cashier**: username: `cashier`, password: `cashier123`

**Important**: Change default passwords after first login!

### API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/products` - Get products (with search/pagination)
- `POST /api/products` - Add new product
- `POST /api/sales` - Process sale transaction
- `GET /api/transactions` - Get transaction history
- `GET /api/users` - Get users (admin/manager only)

## Database Schema

- **Users**: ID, username, email, role, permissions, timestamps
- **Products**: ID, name, description, price, stock, timestamps (soft delete)
- **Transactions**: ID, user_id, type, description, amount, product_id, timestamp

## Permission System

### Roles
- **ADMIN**: Full access to all features
- **MANAGER**: Product and sales management, view transactions
- **CASHIER**: Sales processing and product viewing only

### Permissions
Granular permissions can be customized for each user by admins.

## Technology Stack

- **Backend**: Node.js, Express.js, Sequelize ORM
- **Database**: SQLite (easily migrated to PostgreSQL)
- **Authentication**: JWT tokens
- **Validation**: express-validator
- **Security**: bcryptjs, helmet, cors

## Development

The system uses SQLite for easy development setup while maintaining compatibility for PostgreSQL migration in production.

For production deployment, update the database configuration in `backend/config/database.js` to use PostgreSQL.