#!/usr/bin/env node

const fetch = require('node-fetch');

async function testFallback() {
  console.log('🧪 Testing Chat Fallback System...\n');

  const baseUrl = 'http://localhost:3000';
  const testMessage = 'Hello, can you help me?';

  try {
    console.log(`📡 Testing: ${baseUrl}/api/chat`);
    console.log(`💬 Message: "${testMessage}"`);

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        conversationId: 'test-fallback'
      })
    });

    const data = await response.json();

    console.log(`\n📊 Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Chat API responded successfully!');
      console.log(`💬 Response: ${data.response.substring(0, 200)}...`);
      
      if (data.metadata?.isFallback) {
        console.log('🔄 Fallback mode active - OpenAI unavailable but system still works');
        console.log(`📋 Reason: ${data.metadata.reason}`);
      } else {
        console.log('🤖 Full AI mode - OpenAI is working');
      }
    } else {
      console.log('❌ Chat API error');
      console.log(`🚨 Error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.log('❌ Connection failed');
    console.log(`🚨 Error: ${error.message}`);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

testFallback();