const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...')
    
    // Read and execute the SQL setup script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'setup-database.sql'), 'utf8')
    
    // Execute the SQL script using Prisma
    await prisma.$executeRawUnsafe(sqlScript)
    
    console.log('✅ Database initialized successfully!')
    console.log('📊 Vector extension enabled')
    console.log('🔍 Semantic search functions created')
    console.log('📈 Vector indexes created')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initializeDatabase()