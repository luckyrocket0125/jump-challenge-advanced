const { execSync } = require('child_process')
const fs = require('fs')

console.log('🚀 Setting up Financial Advisor AI...')
console.log('')

// Check if .env.local exists
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  .env.local not found. Please create it with your database credentials.')
  console.log('   See DATABASE_SETUP.md for instructions.')
  process.exit(1)
}

try {
  console.log('📦 Generating Prisma client...')
  execSync('npx prisma generate', { stdio: 'inherit' })
  
  console.log('📊 Pushing schema to database...')
  execSync('npx prisma db push', { stdio: 'inherit' })
  
  console.log('')
  console.log('✅ Setup completed successfully!')
  console.log('')
  console.log('🎉 Your Financial Advisor AI is ready!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Add your API keys to .env.local:')
  console.log('   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET')
  console.log('   - HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET')
  console.log('   - OPENAI_API_KEY')
  console.log('')
  console.log('2. Start the development server:')
  console.log('   npm run dev')
  console.log('')
  console.log('3. Open http://localhost:3000 and sign in with Google')
  console.log('')
  
} catch (error) {
  console.error('❌ Setup failed:', error.message)
  console.log('')
  console.log('Please check:')
  console.log('1. Your database is running and accessible')
  console.log('2. Your DATABASE_URL in .env.local is correct')
  console.log('3. You have the necessary permissions')
  console.log('')
  console.log('See DATABASE_SETUP.md for detailed instructions.')
  process.exit(1)
}