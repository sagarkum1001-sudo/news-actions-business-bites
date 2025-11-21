// Vercel API Route: /api/auth/session
// Handles Google OAuth session creation and user management

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('🔐 Auth session API called - VERCEL VERSION');
  console.log(`${req.method} ${req.url}`);

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract request data
    const { user_type, login_method, google_user } = req.body;

    console.log('📥 Received session request:', {
      user_type,
      login_method,
      has_google_user: !!google_user
    });

    if (!google_user || !google_user.id) {
      console.error('❌ Missing Google user data');
      return res.status(400).json({
        success: false,
        error: 'Google user data required'
      });
    }

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', google_user.id)
      .single();

    let userRecord;
    const now = new Date().toISOString();

    if (existingUser) {
      // Update existing user
      console.log('📝 Updating existing user:', existingUser.id);

      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          name: google_user.name || existingUser.name,
          email: google_user.email || existingUser.email,
          picture: google_user.picture || existingUser.picture,
          login_method: login_method || existingUser.login_method,
          last_login: now,
          updated_at: now
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user'
        });
      }

      userRecord = data;
      console.log('✅ User updated successfully');
    } else {
      // Create new user
      console.log('🆕 Creating new user provider_id:', google_user.id);

      const userData = {
        google_id: google_user.id,
        name: google_user.name,
        email: google_user.email,
        picture: google_user.picture,
        login_method: login_method || 'google',
        user_type: user_type || 'free',
        created_at: now,
        updated_at: now,
        last_login: now
      };

      const { data, error: insertError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating user:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user'
        });
      }

      userRecord = data;
      console.log('✅ New user created successfully');
    }

    // Create session data
    const sessionData = {
      user_id: userRecord.id,
      google_id: userRecord.google_id,
      session_token: `session_${userRecord.id}_${Date.now()}`,
      created_at: now,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      login_method: userRecord.login_method,
      user_type: userRecord.user_type
    };

    console.log('📤 Returning session data:', {
      user_id: sessionData.user_id,
      session_created: true
    });

    // Return session data to frontend
    res.status(200).json({
      success: true,
      user: {
        id: userRecord.id,
        google_id: userRecord.google_id,
        name: userRecord.name,
        email: userRecord.email,
        picture: userRecord.picture,
        login_method: userRecord.login_method,
        user_type: userRecord.user_type,
        created_at: userRecord.created_at
      },
      session: sessionData
    });

  } catch (error) {
    console.error('❌ Session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
