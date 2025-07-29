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

### Easy Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd storefront-management

# Run the startup script
./start.sh
```

This will automatically:
- Install all dependencies
- Start both backend and frontend servers
- Display access URLs and demo credentials

### Manual Setup

#### Backend Setup

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
   npm start
   ```

The backend server will start on port 5000 with SQLite database auto-created.

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The frontend will be available at http://localhost:3000

### Default Users

- **Admin**: username: `admin`, password: `admin123`
- **Manager**: username: `manager`, password: `manager123`  
- **Cashier**: username: `cashier`, password: `cashier123`

**Important**: Change default passwords after first login!

## System Overview

### User Roles & Permissions

#### Admin
- Full access to all features
- User management (create, edit, delete users)
- Product management (full CRUD operations)
- Sales processing
- View all transactions and reports

#### Manager  
- Product management (add, edit products, update stock)
- Sales processing
- View transactions and reports
- Limited user viewing permissions

#### Cashier
- Product viewing only
- Sales processing
- No access to user management or transaction history

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user info

#### Products
- `GET /api/products` - Get products (with search/pagination)
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete product
- `PUT /api/products/:id/stock` - Update stock levels

#### Sales
- `POST /api/sales` - Process sale transaction
- `GET /api/sales/history` - Get sales history
- `GET /api/sales/reports/daily` - Daily sales report
- `GET /api/sales/reports/period` - Period sales report

#### Users
- `GET /api/users` - Get users (admin/manager only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

#### Transactions
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/stats/summary` - Transaction statistics

## Database Schema

### Users Table
- ID, username, email, role, permissions, created_at, updated_at, deleted_at
- Roles: ADMIN, MANAGER, CASHIER
- Soft delete enabled

### Products Table  
- ID, name, description, price, stock_quantity, sku, category, created_at, updated_at, deleted_at
- Soft delete enabled for audit trail
- Stock validation and low stock alerts

### Transactions Table
- ID, user_id, transaction_type, description, amount, product_id, quantity, created_at
- Complete audit trail of all system operations
- Transaction types: PRODUCT_ADD, PRODUCT_UPDATE, PRODUCT_DELETE, STOCK_UPDATE, SALE, USER_CREATE, USER_UPDATE, USER_DELETE, LOGIN, LOGOUT

## Technology Stack

- **Backend**: Node.js, Express.js, Sequelize ORM
- **Database**: SQLite (easily migrated to PostgreSQL)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Security**: helmet, cors, input validation
- **Validation**: express-validator

## Production Deployment

### PostgreSQL Migration

The system is designed for easy migration from SQLite to PostgreSQL:

1. Update `backend/config/database.js`:
```javascript
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
```

2. Install PostgreSQL driver:
```bash
npm install pg pg-hstore
```

3. Set environment variables:
```bash
export DATABASE_URL=postgresql://username:password@localhost:5432/storefront
export JWT_SECRET=your-production-secret
export NODE_ENV=production
```

### Environment Variables

Create `.env` files for each environment:

#### Backend `.env`
```
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-key
NODE_ENV=production
DATABASE_URL=your-database-connection-string
```

### Security Considerations

- Change all default passwords immediately
- Use strong JWT secrets in production
- Enable HTTPS in production
- Set up proper CORS origins
- Regular database backups
- Monitor transaction logs for suspicious activity

## Development

### Project Structure
```
├── backend/
│   ├── config/          # Database configuration
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── seeders/         # Database seed data
│   └── server.js        # Main server file
├── frontend/
│   ├── public/          # Static HTML files
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── utils/       # API and auth utilities
│   │   └── styles/      # CSS styles
│   └── server.js        # Frontend server
└── start.sh             # Quick start script
```

### Adding New Features

1. **Backend**: Add new routes in `backend/routes/`
2. **Frontend**: Add new components in `frontend/src/components/`
3. **Database**: Update models in `backend/models/`
4. **Permissions**: Update permission checks in middleware

The system uses a modular architecture making it easy to extend with new features while maintaining security and data integrity.