require('dotenv').config();
const { supabase } = require('./config/supabase');

(async () => {
  try {
    console.log('🔧 Fixing users table schema...');
    
    // First, let's try to check if we can access the table at all
    console.log('\n1. Testing current table access...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Current table access error:', testError.message);
    } else {
      console.log('✅ Table accessible, found', testData.length, 'records');
    }
    
    // Try to create a minimal users table structure
    console.log('\n2. Attempting to create/recreate users table...');
    
    // Since we can't run DDL directly, let's try a workaround
    // by testing what happens when we try to insert minimal data
    const minimalUserData = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      password_hash: 'test_hash',
      full_name: 'Test User',
      role: 'farmer'
    };
    
    console.log('Testing minimal insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(minimalUserData)
      .select();
    
    if (insertError) {
      console.log('❌ Minimal insert failed:', insertError.message);
      
      // Check if it's a missing column issue
      if (insertError.message.includes('schema cache')) {
        console.log('\n🚨 SCHEMA CACHE ISSUE DETECTED!');
        console.log('\nThis appears to be a Supabase schema cache problem.');
        console.log('\nTo fix this, you need to:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the migration script: migrate-users-schema.sql');
        console.log('4. Or manually create the users table with all required columns');
        console.log('\nRequired columns for users table:');
        console.log('- id (UUID, PRIMARY KEY)');
        console.log('- email (VARCHAR, UNIQUE, NOT NULL)');
        console.log('- password_hash (VARCHAR, NOT NULL)');
        console.log('- full_name (VARCHAR, NOT NULL)');
        console.log('- phone (VARCHAR)');
        console.log('- role (VARCHAR, CHECK constraint)');
        console.log('- avatar_url (TEXT)');
        console.log('- address (TEXT) <- This is the missing column!');
        console.log('- is_verified (BOOLEAN, DEFAULT FALSE)');
        console.log('- is_active (BOOLEAN, DEFAULT TRUE)');
        console.log('- created_at (TIMESTAMP)');
        console.log('- updated_at (TIMESTAMP)');
      }
    } else {
      console.log('✅ Minimal insert successful!');
      console.log('Available columns:', Object.keys(insertData[0]));
      
      // Test if address column exists
      console.log('\n3. Testing address column...');
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ address: 'Test Address' })
        .eq('id', insertData[0].id)
        .select();
      
      if (updateError) {
        console.log('❌ Address column missing:', updateError.message);
        console.log('\n🔧 SOLUTION: Add address column to users table');
        console.log('Run this SQL in Supabase Dashboard:');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;');
      } else {
        console.log('✅ Address column exists and working!');
        console.log('Updated user:', updateData[0]);
      }
      
      // Clean up test data
      await supabase.from('users').delete().eq('id', insertData[0].id);
      console.log('\n🧹 Test data cleaned up');
    }
    
  } catch (e) {
    console.error('💥 Unexpected error:', e.message);
  }
})();