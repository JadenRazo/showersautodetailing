#!/bin/bash

# Showers Auto Detailing - Setup Script
# This script automates the initial setup process

set -e

echo "========================================="
echo "Showers Auto Detailing - Setup"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create .env file from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your actual API keys and configuration:"
    echo "   - Square keys (for payment processing)"
    echo "   - Brevo API key (for email notifications)"
    echo "   - Telnyx credentials (for SMS notifications)"
    echo "   - Google Maps API key (for service area map)"
    echo ""
    read -p "Press Enter to continue after you've configured .env, or Ctrl+C to exit and configure later..."
else
    echo "✅ .env file already exists"
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
if [ -f package.json ]; then
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  package.json not found, skipping frontend dependencies"
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
if [ -f backend/package.json ]; then
    cd backend
    npm install
    cd ..
    echo "✅ Backend dependencies installed"
else
    echo "⚠️  backend/package.json not found, skipping backend dependencies"
fi

# Create directories
echo ""
echo "📁 Creating required directories..."
mkdir -p public/images
mkdir -p logs
echo "✅ Directories created"

# Build and start Docker containers
echo ""
echo "🐳 Building and starting Docker containers..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Docker containers are running"
else
    echo "❌ Some containers failed to start. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi

# Check database connection
echo ""
echo "🔍 Checking database connection..."
if docker-compose exec -T postgres pg_isready -U detailing_user > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "⚠️  Database connection check failed"
fi

# Check backend health
echo ""
echo "🔍 Checking backend API..."
sleep 5
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "⚠️  Backend API health check failed. It may still be starting up."
fi

# Display success message
echo ""
echo "========================================="
echo "✨ Setup Complete!"
echo "========================================="
echo ""
echo "Your website is now running at:"
echo "  🌐 Frontend:  http://localhost:4321"
echo "  🔧 Backend:   http://localhost:3000"
echo "  💾 Database:  localhost:5432"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose stop             # Stop services"
echo "  docker-compose start            # Start services"
echo "  docker-compose down             # Stop and remove containers"
echo "  docker-compose down -v          # Stop and remove containers + volumes"
echo ""
echo "Next steps:"
echo "  1. Verify .env configuration (especially API keys)"
echo "  2. Visit http://localhost:4321 to see your website"
echo "  3. Test the quote calculator and other features"
echo "  4. Customize business information in .env"
echo "  5. Add your own before/after photos to the gallery"
echo ""
echo "For deployment instructions, see README.md"
echo ""
