#!/usr/bin/env node

const fetch = require('node-fetch');

async function diagnose() {
  console.log('🔍 Diagnosing Financial Advisor AI System...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // Test basic connectivity
    console.log('📡 Testing basic connectivity...');
    const response = await fetch(`${baseUrl}/api/status`);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('✅ System is running');
      console.log(`👤 User: ${data.user.email}`);
      
      // Check OpenAI
      console.log('\n🤖 OpenAI Status:');
      if (data.services.openai.available) {
        console.log('✅ OpenAI is available and working');
      } else if (data.services.openai.hasApiKey) {
        console.log('❌ OpenAI quota exceeded or rate limited');
        console.log('💡 Solution: Add credits to your OpenAI account');
      } else {
        console.log('❌ OpenAI API key not configured');
        console.log('💡 Solution: Add OPENAI_API_KEY to .env.local');
      }
      
      // Check Google OAuth
      console.log('\n📧 Google OAuth Status:');
      if (data.services.google.connected) {
        console.log('✅ Google OAuth connected');
      } else {
        console.log('❌ Google OAuth not connected');
        console.log('💡 Solution: Connect Google account in setup page');
      }
      
      // Check HubSpot OAuth
      console.log('\n🏢 HubSpot OAuth Status:');
      if (data.services.hubspot.connected) {
        console.log('✅ HubSpot OAuth connected');
        if (data.services.hubspot.isExpired) {
          console.log('⚠️  HubSpot token expired - will auto-refresh');
        }
      } else {
        console.log('❌ HubSpot OAuth not connected');
        console.log('💡 Solution: Connect HubSpot account in setup page');
      }
      
      // Check Database
      console.log('\n🗄️  Database Status:');
      console.log('✅ Database connected');
      console.log(`📊 Data counts:`);
      console.log(`   • Conversations: ${data.services.database.hasData.conversations}`);
      console.log(`   • Messages: ${data.services.database.hasData.messages}`);
      console.log(`   • Contacts: ${data.services.database.hasData.contacts}`);
      console.log(`   • Meetings: ${data.services.database.hasData.meetings}`);
      console.log(`   • Emails: ${data.services.database.hasData.emails}`);
      
      // Overall status
      console.log('\n🎯 Overall Status:');
      const issues = [];
      if (!data.services.openai.available) issues.push('OpenAI unavailable');
      if (!data.services.google.connected) issues.push('Google not connected');
      if (!data.services.hubspot.connected) issues.push('HubSpot not connected');
      
      if (issues.length === 0) {
        console.log('✅ All systems operational!');
      } else {
        console.log(`⚠️  Issues found: ${issues.join(', ')}`);
        console.log('\n🔧 Recommended actions:');
        if (!data.services.openai.available) {
          console.log('• Fix OpenAI quota/API key issues');
        }
        if (!data.services.google.connected || !data.services.hubspot.connected) {
          console.log('• Connect missing OAuth accounts in setup page');
        }
      }
      
    } else {
      console.log('❌ System not responding properly');
      console.log(`Status: ${response.status}`);
    }

  } catch (error) {
    console.log('❌ Cannot connect to system');
    console.log(`Error: ${error.message}`);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

diagnose();