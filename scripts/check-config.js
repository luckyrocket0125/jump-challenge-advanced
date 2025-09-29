#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Financial Advisor AI Configuration...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copying env.example to .env.local...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env.local from env.example');
    console.log('⚠️  Please edit .env.local with your actual values\n');
  } else {
    console.log('❌ env.example file not found either');
    process.exit(1);
  }
} else {
  console.log('✅ .env.local file exists');
}

// Load environment variables
require('dotenv').config({ path: envPath });

const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'HUBSPOT_CLIENT_ID',
  'HUBSPOT_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'DATABASE_URL'
];

console.log('\n🔧 Checking required environment variables:');

let allConfigured = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your-') || value.includes('PLACEHOLDER')) {
    console.log(`❌ ${varName}: Not configured`);
    allConfigured = false;
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

console.log('\n📊 Configuration Summary:');
if (allConfigured) {
  console.log('✅ All required environment variables are configured');
  console.log('🚀 You should be able to run the application');
} else {
  console.log('❌ Some environment variables need to be configured');
  console.log('📝 Please edit .env.local with your actual values');
  console.log('\n🔗 Setup guides:');
  console.log('• Google OAuth: https://console.cloud.google.com');
  console.log('• HubSpot OAuth: https://developers.hubspot.com');
  console.log('• OpenAI API: https://platform.openai.com');
}

// Check database
console.log('\n🗄️  Database Configuration:');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl.includes('file:') || dbUrl.includes('sqlite')) {
    console.log('✅ SQLite database configured (development)');
  } else if (dbUrl.includes('postgresql://')) {
    console.log('✅ PostgreSQL database configured (production)');
  } else {
    console.log('⚠️  Unknown database type');
  }
} else {
  console.log('❌ DATABASE_URL not configured');
}

console.log('\n🎯 Next Steps:');
if (!allConfigured) {
  console.log('1. Edit .env.local with your actual API keys and secrets');
  console.log('2. Run: npm run db:push (to set up database)');
  console.log('3. Run: npm run dev (to start development server)');
} else {
  console.log('1. Run: npm run db:push (to set up database)');
  console.log('2. Run: npm run dev (to start development server)');
  console.log('3. Open: http://localhost:3000');
}