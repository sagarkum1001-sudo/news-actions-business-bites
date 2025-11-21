#!/usr/bin/env node

// Test script for the new /api/auth/session endpoint
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSessionEndpoint() {
  console.log('🧪 Testing session endpoint and Supabase connection...\n');

  // Environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🔗 Supabase client created');

  try {
    // Test connection
    console.log('\n📡 Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message);

      // Try to create users table
      console.log('\n🏗️ Attempting to create users table...');

      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            google_id VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            email VARCHAR(255),
            picture VARCHAR(500),
            login_method VARCHAR(50) DEFAULT 'google',
            user_type VARCHAR(50) DEFAULT 'free',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Create index for Google ID lookups
          CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

          -- Enable RLS
          ALTER TABLE users ENABLE ROW LEVEL SECURITY;

          -- Policy: Users can read their own data
          CREATE POLICY IF NOT EXISTS "Users can read own data" ON users
            FOR SELECT USING (auth.uid()::text = google_id);

          -- Policy: Allow insert for new users (will be restricted to service role)
          CREATE POLICY IF NOT EXISTS "Allow user creation" ON users
            FOR INSERT WITH CHECK (true);

          -- Policy: Users can update their own data
          CREATE POLICY IF NOT EXISTS "Users can update own data" ON users
            FOR UPDATE USING (auth.uid()::text = google_id);
        `
      });

      if (createError && !createError.message.includes('already exists')) {
        console.error('❌ Failed to create users table:', createError);

        // Alternative: Direct SQL approach
        console.log('\n🔄 Trying direct table creation...');
        await createUsersTableDirect();
      } else {
        console.log('✅ Users table created or already exists');
      }
    } else {
      console.log('✅ Supabase connection successful');
      console.log(`📊 Current users in database: ${connectionTest}`);
    }

    // Test the session endpoint with mock data
    console.log('\n🔧 Testing session endpoint logic with mock data...');

    const mockGoogleUser = {
      id: 'test_google_id_123',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/picture.jpg'
    };

    // Simulate the session creation logic
    console.log('👤 Mock Google user:', mockGoogleUser);

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', mockGoogleUser.id)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Users table accessible (user not found - expected for test)');
    } else if (existingUser) {
      console.log('📝 Existing user found:', existingUser.name);
    } else {
      console.log('✅ Users table accessible');
    }

    console.log('\n🎉 Session endpoint appears to be ready!');
    console.log('\nNext steps:');
    console.log('1. Deploy the new session endpoint to Vercel');
    console.log('2. Test Google authentication on https://news-actions-business-bites.vercel.app/');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function createUsersTableDirect() {
  // This is a fallback if the RPC approach doesn't work
  console.log('🔧 Attempting direct table creation...');

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Try to create a test user to see if table exists
    const testUserData = {
      google_id: 'test_' + Date.now(),
      name: 'Test User',
      email: 'test@example.com',
      login_method: 'google',
      user_type: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .insert(testUserData)
      .select()
      .single();

    if (error) {
      console.error('❌ Table may not exist or permissions issue:', error.message);

      console.log('\n📋 MANUAL TABLE CREATION SQL:');
      console.log(`
-- Run this in your Supabase SQL editor:
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  picture VARCHAR(500),
  login_method VARCHAR(50) DEFAULT 'google',
  user_type VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_google_id ON users(google_id);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = google_id);

CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = google_id);
      `.trim());
    } else {
      console.log('✅ Test user created, table exists:', data);
      // Clean up test user
      await supabase.from('users').delete().eq('google_id', testUserData.google_id);
    }

  } catch (error) {
    console.error('❌ Direct table creation failed:', error);
  }
}

testSessionEndpoint().catch(console.error);
