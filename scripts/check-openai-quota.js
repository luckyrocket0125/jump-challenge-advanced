#!/usr/bin/env node

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    // Handle multi-line values by joining lines that don't start with a new key
    const lines = envContent.split('\n');
    let currentKey = null;
    let currentValue = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Check if this line starts a new key-value pair
      if (trimmedLine.includes('=') && !trimmedLine.startsWith(' ')) {
        // Save previous key-value pair
        if (currentKey) {
          process.env[currentKey] = currentValue.replace(/^["']|["']$/g, '');
        }
        
        // Start new key-value pair
        const [key, ...valueParts] = trimmedLine.split('=');
        currentKey = key.trim();
        currentValue = valueParts.join('=').trim();
      } else {
        // Continue previous value (multi-line)
        currentValue += trimmedLine;
      }
    }
    
    // Save the last key-value pair
    if (currentKey) {
      process.env[currentKey] = currentValue.replace(/^["']|["']$/g, '');
    }
  }
}

loadEnvFile();

async function checkOpenAIQuota() {
  console.log('🔍 Checking OpenAI API Status...\n');
  
  // Debug: show what we loaded
  console.log('🔧 Debug - Environment variables loaded:');
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  if (process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY.length);
    console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('📝 Please add your OpenAI API key to .env.local');
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Test with a simple completion
    console.log('🧪 Testing API connection...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });

    console.log('✅ OpenAI API is working!');
    console.log(`💬 Test response: ${response.choices[0]?.message?.content}`);

  } catch (error) {
    console.log('❌ OpenAI API Error:');
    
    if (error.code === 'insufficient_quota') {
      console.log('🚨 QUOTA EXCEEDED');
      console.log('💳 Your OpenAI account has exceeded its usage quota');
      console.log('\n🔧 Solutions:');
      console.log('• Add credits to your OpenAI account');
      console.log('• Check your usage limits at: https://platform.openai.com/usage');
      console.log('• Wait for quota to reset (usually monthly)');
      console.log('• Consider upgrading your plan');
    } else if (error.code === 'invalid_api_key') {
      console.log('🔑 INVALID API KEY');
      console.log('• Check your API key in .env.local');
      console.log('• Generate a new key at: https://platform.openai.com/api-keys');
    } else if (error.code === 'rate_limit_exceeded') {
      console.log('⏱️  RATE LIMIT EXCEEDED');
      console.log('• Too many requests in a short time');
      console.log('• Wait a few minutes and try again');
    } else {
      console.log(`🚨 ${error.code || 'Unknown error'}: ${error.message}`);
    }
  }
}

checkOpenAIQuota();