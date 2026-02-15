const fixGreenwoodData = async () => {
  try {
    console.log('🔧 Fixing Greenwood Academy data structure...');
    
    // Login as admin
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    const schoolId = loginResult.user.schoolId;
    
    console.log('🔐 Logged in as admin, schoolId:', schoolId);
    
    // Step 1: Create classes
    console.log('📚 Creating classes...');
    const classesToCreate = [
      { name: 'Grade 1', sortOrder: 1 },
      { name: 'Grade 2', sortOrder: 2 },
      { name: 'Grade 3', sortOrder: 3 },
      { name: 'Grade 4', sortOrder: 4 },
      { name: 'Grade 5', sortOrder: 5 }
    ];
    
    for (const classData of classesToCreate) {
      const classResponse = await fetch('http://localhost:3006/api/sms/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(classData)
      });
      
      if (classResponse.ok) {
        const createdClass = await classResponse.json();
        console.log(`✅ Created class: ${createdClass.name}`);
      } else {
        const error = await classResponse.json();
        console.log(`❌ Failed to create class ${classData.name}:`, error.message);
      }
    }
    
    // Step 2: Get students and enroll them
    console.log('👨‍🎓 Getting students...');
    const usersResponse = await fetch('http://localhost:3006/api/users?role=student', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const students = await usersResponse.json();
    console.log(`📊 Found ${students.length} students`);
    
    // Step 3: Get academic year
    const yearsResponse = await fetch('http://localhost:3006/api/sms/academic-years', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const years = await yearsResponse.json();
    const activeYear = years.find(y => y.isActive);
    
    if (!activeYear) {
      console.log('❌ No active academic year found');
      return;
    }
    
    console.log(`📅 Using academic year: ${activeYear.name}`);
    
    // Step 4: Enroll students in classes
    console.log('📝 Enrolling students...');
    let enrollCount = 0;
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const gradeLevel = Math.floor(i / 3) + 1; // Distribute across grades 1-5
      
      const enrollmentResponse = await fetch('http://localhost:3006/api/sms/students/enroll', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: student.id,
          classId: `grade-${gradeLevel}`, // This will need to be updated with actual class ID
          academicYearId: activeYear.id
        })
      });
      
      if (enrollmentResponse.ok) {
        enrollCount++;
        if (enrollCount % 5 === 0) {
          console.log(`✅ Enrolled ${enrollCount} students so far...`);
        }
      } else {
        const error = await enrollmentResponse.json();
        console.log(`❌ Failed to enroll ${student.name}:`, error.message);
      }
    }
    
    console.log(`🎉 Enrollment complete! Successfully enrolled ${enrollCount} students`);
    
    // Step 5: Test dashboard
    console.log('📊 Testing dashboard...');
    const dashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const dashboardData = await dashboardResponse.json();
    console.log('📊 Dashboard students count:', dashboardData.cards?.students);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

fixGreenwoodData();
