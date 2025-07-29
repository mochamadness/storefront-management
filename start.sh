#!/bin/bash

# Storefront Management System Deployment Script

echo "Starting Storefront Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies  
echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Start backend server in background
echo "Starting backend server..."
cd ../backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "=========================="
echo "Storefront Management System is running!"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo ""
echo "Demo Credentials:"
echo "Admin: admin / admin123"
echo "Manager: manager / manager123"  
echo "Cashier: cashier / cashier123"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================="

# Wait for user interrupt
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait