const createEnrollmentsDirectly = async () => {
  try {
    console.log('🔧 Creating enrollments directly in database...');
    
    // Import database modules
    const { db } = await import('./server/db.js');
    const { eq, and } = await import('drizzle-orm');
    const { users, studentEnrollments, schoolClasses, academicYears } = await import('@shared/schema');
    
    // Get Greenwood Academy info
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin.greenwood@campus-sim.edu')).limit(1);
    const schoolId = admin?.schoolId;
    
    if (!schoolId) {
      console.log('❌ Admin schoolId not found');
      return;
    }
    
    console.log('🏫 School ID:', schoolId);
    
    // Get active academic year
    const [activeYear] = await db.select().from(academicYears).where(and(
      eq(academicYears.schoolId, schoolId),
      eq(academicYears.isActive, true)
    )).limit(1);
    
    if (!activeYear) {
      console.log('❌ No active academic year found');
      return;
    }
    
    console.log('📅 Active year:', activeYear.name);
    
    // Get classes
    const classes = await db.select().from(schoolClasses).where(eq(schoolClasses.schoolId, schoolId));
    console.log('📚 Classes found:', classes.length);
    
    // Get students
    const students = await db.select().from(users).where(and(
      eq(users.schoolId, schoolId),
      eq(users.role, 'student')
    ));
    
    console.log('👨‍🎓 Students found:', students.length);
    
    // Create enrollments
    let enrollmentCount = 0;
    for (const student of students) {
      // Assign to a class based on index
      const classIndex = enrollmentCount % classes.length;
      const assignedClass = classes[classIndex];
      
      if (!assignedClass) {
        console.log('❌ No class available for student');
        continue;
      }
      
      // Check if already enrolled
      const [existingEnrollment] = await db.select().from(studentEnrollments).where(and(
        eq(studentEnrollments.schoolId, schoolId),
        eq(studentEnrollments.academicYearId, activeYear.id),
        eq(studentEnrollments.studentId, student.id)
      )).limit(1);
      
      if (existingEnrollment) {
        console.log(`⚠️  Student ${student.name} already enrolled`);
        continue;
      }
      
      // Create enrollment
      await db.insert(studentEnrollments).values({
        schoolId,
        academicYearId: activeYear.id,
        studentId: student.id,
        classId: assignedClass.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      enrollmentCount++;
      if (enrollmentCount % 10 === 0) {
        console.log(`✅ Enrolled ${enrollmentCount} students so far...`);
      }
    }
    
    console.log(`🎉 Successfully created ${enrollmentCount} student enrollments!`);
    
    // Test dashboard
    console.log('📊 Testing dashboard after enrollment creation...');
    
    // Login to get token
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    
    const dashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const dashboardData = await dashboardResponse.json();
    console.log('📊 Dashboard students count after fix:', dashboardData.cards?.students);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

createEnrollmentsDirectly();
