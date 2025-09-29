# Financial Advisor AI Deployment Script for Windows PowerShell
# This script helps deploy the application to various platforms

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("render", "fly", "vercel", "build", "migrate")]
    [string]$Platform
)

Write-Host "🚀 Financial Advisor AI Deployment Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if required tools are installed
function Check-Dependencies {
    Write-Host "📋 Checking dependencies..." -ForegroundColor Yellow
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Node.js is not installed" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "❌ npm is not installed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Dependencies check passed" -ForegroundColor Green
}

# Build the application
function Build-App {
    Write-Host "🔨 Building application..." -ForegroundColor Yellow
    
    # Install dependencies
    npm ci
    
    # Generate Prisma client
    npx prisma generate
    
    # Build the application
    npm run build
    
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
}

# Deploy to Render
function Deploy-Render {
    Write-Host "🌐 Deploying to Render..." -ForegroundColor Yellow
    
    if (-not (Test-Path "render.yaml")) {
        Write-Host "❌ render.yaml not found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📝 Render configuration found" -ForegroundColor Green
    Write-Host "Please follow these steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Create a new Web Service" -ForegroundColor White
    Write-Host "3. Connect your GitHub repository" -ForegroundColor White
    Write-Host "4. Use the render.yaml configuration" -ForegroundColor White
    Write-Host "5. Set up environment variables" -ForegroundColor White
    Write-Host "6. Deploy" -ForegroundColor White
    
    Write-Host "✅ Render deployment instructions provided" -ForegroundColor Green
}

# Deploy to Fly.io
function Deploy-Fly {
    Write-Host "✈️ Deploying to Fly.io..." -ForegroundColor Yellow
    
    if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Fly CLI is not installed" -ForegroundColor Red
        Write-Host "Install it from: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Cyan
        exit 1
    }
    
    # Check if fly.toml exists
    if (-not (Test-Path "fly.toml")) {
        Write-Host "❌ fly.toml not found" -ForegroundColor Red
        exit 1
    }
    
    # Deploy
    fly deploy
    
    Write-Host "✅ Fly.io deployment completed" -ForegroundColor Green
}

# Deploy to Vercel
function Deploy-Vercel {
    Write-Host "▲ Deploying to Vercel..." -ForegroundColor Yellow
    
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Vercel CLI is not installed" -ForegroundColor Red
        Write-Host "Install it with: npm i -g vercel" -ForegroundColor Cyan
        exit 1
    }
    
    # Deploy
    vercel --prod
    
    Write-Host "✅ Vercel deployment completed" -ForegroundColor Green
}

# Run database migrations
function Run-Migrations {
    Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
    
    if (-not $env:DATABASE_URL) {
        Write-Host "❌ DATABASE_URL environment variable not set" -ForegroundColor Red
        exit 1
    }
    
    npx prisma db push
    
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
}

# Main deployment function
switch ($Platform) {
    "render" {
        Check-Dependencies
        Build-App
        Deploy-Render
    }
    "fly" {
        Check-Dependencies
        Build-App
        Deploy-Fly
    }
    "vercel" {
        Check-Dependencies
        Build-App
        Deploy-Vercel
    }
    "build" {
        Check-Dependencies
        Build-App
    }
    "migrate" {
        Run-Migrations
    }
    default {
        Write-Host "Usage: .\scripts\deploy.ps1 -Platform {render|fly|vercel|build|migrate}" -ForegroundColor Red
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  render   - Deploy to Render (with instructions)" -ForegroundColor White
        Write-Host "  fly      - Deploy to Fly.io" -ForegroundColor White
        Write-Host "  vercel   - Deploy to Vercel" -ForegroundColor White
        Write-Host "  build    - Build the application only" -ForegroundColor White
        Write-Host "  migrate  - Run database migrations" -ForegroundColor White
        exit 1
    }
}