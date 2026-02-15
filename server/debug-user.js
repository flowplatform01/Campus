import { db } from './db.js';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';

const debugUser = async () => {
  try {
    console.log('🔍 Debugging user login issue...');
    
    const [user] = await db.select().from(users).where(eq(users.email, 'admin@campus.demo')).limit(1);
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    
    // Test password comparison
    const testPassword = 'Campus@12345';
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('🔐 Password comparison result:', isValid);
    
    // Test with a new hash
    const newHash = await bcrypt.hash(testPassword, 10);
    const isNewHashValid = await bcrypt.compare(testPassword, newHash);
    console.log('🔐 New hash test:', isNewHashValid);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

debugUser();
