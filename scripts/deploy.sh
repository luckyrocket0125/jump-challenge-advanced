#!/bin/bash

# Financial Advisor AI Deployment Script
# This script helps deploy the application to various platforms

set -e

echo "🚀 Financial Advisor AI Deployment Script"
echo "=========================================="

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Build the application
build_app() {
    echo "🔨 Building application..."
    
    # Install dependencies
    npm ci
    
    # Generate Prisma client
    npx prisma generate
    
    # Build the application
    npm run build
    
    echo "✅ Build completed successfully"
}

# Deploy to Render
deploy_render() {
    echo "🌐 Deploying to Render..."
    
    if [ ! -f "render.yaml" ]; then
        echo "❌ render.yaml not found"
        exit 1
    fi
    
    echo "📝 Render configuration found"
    echo "Please follow these steps:"
    echo "1. Go to https://dashboard.render.com"
    echo "2. Create a new Web Service"
    echo "3. Connect your GitHub repository"
    echo "4. Use the render.yaml configuration"
    echo "5. Set up environment variables"
    echo "6. Deploy"
    
    echo "✅ Render deployment instructions provided"
}

# Deploy to Fly.io
deploy_fly() {
    echo "✈️ Deploying to Fly.io..."
    
    if ! command -v fly &> /dev/null; then
        echo "❌ Fly CLI is not installed"
        echo "Install it from: https://fly.io/docs/hands-on/install-flyctl/"
        exit 1
    fi
    
    # Check if fly.toml exists
    if [ ! -f "fly.toml" ]; then
        echo "❌ fly.toml not found"
        exit 1
    fi
    
    # Deploy
    fly deploy
    
    echo "✅ Fly.io deployment completed"
}

# Deploy to Vercel
deploy_vercel() {
    echo "▲ Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI is not installed"
        echo "Install it with: npm i -g vercel"
        exit 1
    fi
    
    # Deploy
    vercel --prod
    
    echo "✅ Vercel deployment completed"
}

# Run database migrations
run_migrations() {
    echo "🗄️ Running database migrations..."
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL environment variable not set"
        exit 1
    fi
    
    npx prisma db push
    
    echo "✅ Database migrations completed"
}

# Main deployment function
main() {
    local platform=$1
    
    case $platform in
        "render")
            check_dependencies
            build_app
            deploy_render
            ;;
        "fly")
            check_dependencies
            build_app
            deploy_fly
            ;;
        "vercel")
            check_dependencies
            build_app
            deploy_vercel
            ;;
        "build")
            check_dependencies
            build_app
            ;;
        "migrate")
            run_migrations
            ;;
        *)
            echo "Usage: $0 {render|fly|vercel|build|migrate}"
            echo ""
            echo "Commands:"
            echo "  render   - Deploy to Render (with instructions)"
            echo "  fly      - Deploy to Fly.io"
            echo "  vercel   - Deploy to Vercel"
            echo "  build    - Build the application only"
            echo "  migrate  - Run database migrations"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"