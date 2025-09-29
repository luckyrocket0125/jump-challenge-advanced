const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function migrateDatabase() {
  try {
    console.log('🚀 Starting database migration...')
    
    // Generate Prisma client
    console.log('📦 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Push schema to database
    console.log('📊 Pushing schema to database...')
    execSync('npx prisma db push', { stdio: 'inherit' })
    
    // Initialize database with vector extensions
    console.log('🔧 Initializing vector extensions...')
    execSync('node scripts/init-db.js', { stdio: 'inherit' })
    
    console.log('✅ Database migration completed successfully!')
    console.log('🎉 Your database is ready with vector search capabilities!')
    
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    process.exit(1)
  }
}

migrateDatabase()