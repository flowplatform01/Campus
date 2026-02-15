const { db } = require('./db.js');
const { users } = require('@shared/schema');
const { sql } = require('drizzle-orm');

console.log('Testing database connection...');

async function testConnection() {
  try {
    await db.select({ count: sql`COUNT(*)` }).from(users);
    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();
