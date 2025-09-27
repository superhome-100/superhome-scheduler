#!/usr/bin/env node

/**
 * Database Setup Script for SuperHOME Scheduler
 * Run this after `supabase start` to ensure database is properly initialized
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Setting up SuperHOME Scheduler database...');

try {
  // Check if Supabase CLI is available
  execSync('supabase --version', { stdio: 'pipe' });
  console.log('✅ Supabase CLI found');
} catch (error) {
  console.error('❌ Supabase CLI not found. Please install it first.');
  process.exit(1);
}

try {
  // Reset and migrate database
  console.log('🔄 Resetting database...');
  execSync('supabase db reset', { stdio: 'inherit', cwd: __dirname });
  
  console.log('✅ Database reset complete');
  console.log('✅ Migrations applied');
  console.log('');
  console.log('🎉 Database setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Configure OAuth providers in Supabase Studio: http://localhost:54323');
  console.log('');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('');
  console.log('Troubleshooting:');
  console.log('1. Make sure Supabase is running: supabase start');
  console.log('2. Check if you\'re in the correct directory');
  console.log('3. Verify supabase/config.toml exists');
  process.exit(1);
}
