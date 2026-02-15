import { db } from './db.js';
import { eq, and } from 'drizzle-orm';
import { users, schools, studentEnrollments, schoolClasses, academicYears } from '@shared/schema';

const debugGreenwood = async () => {
  try {
    console.log('🔍 Debugging Greenwood Academy data...');
    
    // Check admin user
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin.greenwood@campus-sim.edu')).limit(1);
    console.log('👤 Admin User:', admin ? {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      schoolId: admin.schoolId
    } : 'Not found');
    
    if (admin?.schoolId) {
      // Check school
      const [school] = await db.select().from(schools).where(eq(schools.id, admin.schoolId)).limit(1);
      console.log('🏫 School:', school ? {
        id: school.id,
        name: school.name,
        address: school.address
      } : 'Not found');
      
      // Check students in this school
      const students = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      }).from(users).where(and(
        eq(users.schoolId, admin.schoolId),
        eq(users.role, 'student')
      ));
      
      console.log('👨‍🎓 Students count:', students.length);
      if (students.length > 0) {
        console.log('First 3 students:', students.slice(0, 3));
      }
      
      // Check classes in this school
      const classes = await db.select().from(schoolClasses).where(eq(schoolClasses.schoolId, admin.schoolId));
      console.log('📚 Classes count:', classes.length);
      if (classes.length > 0) {
        console.log('Classes:', classes.map(c => ({ id: c.id, name: c.name })));
      }
      
      // Check academic years
      const years = await db.select().from(academicYears).where(eq(academicYears.schoolId, admin.schoolId));
      console.log('📅 Academic Years count:', years.length);
      if (years.length > 0) {
        console.log('Years:', years.map(y => ({ id: y.id, name: y.name, isActive: y.isActive })));
      }
      
      // Check enrollments
      const enrollments = await db.select().from(studentEnrollments).where(eq(studentEnrollments.schoolId, admin.schoolId));
      console.log('📝 Enrollments count:', enrollments.length);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

debugGreenwood();
