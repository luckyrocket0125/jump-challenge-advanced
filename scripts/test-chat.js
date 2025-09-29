#!/usr/bin/env node

const fetch = require('node-fetch');

async function testChatAPI() {
  console.log('🧪 Testing Chat API...\n');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const testMessage = 'Hello, can you help me with my financial advisor tasks?';

  try {
    console.log(`📡 Testing API endpoint: ${baseUrl}/api/chat`);
    console.log(`💬 Test message: "${testMessage}"`);

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        conversationId: 'test-conversation'
      })
    });

    const data = await response.json();

    console.log(`\n📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Chat API is working!');
      console.log(`💬 Response: ${data.response.substring(0, 200)}...`);
      
      if (data.metadata) {
        console.log(`📋 Metadata:`, JSON.stringify(data.metadata, null, 2));
      }
    } else {
      console.log('❌ Chat API returned an error');
      console.log(`🚨 Error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.log('❌ Failed to connect to Chat API');
    console.log(`🚨 Error: ${error.message}`);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testChatAPI();