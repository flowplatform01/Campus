const fixGreenwoodEnrollments = async () => {
  try {
    console.log('🔧 Creating Greenwood Academy enrollments...');
    
    // Step 1: Login and get basic data
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    const schoolId = loginResult.user.schoolId;
    
    console.log('🔐 Logged in, schoolId:', schoolId);
    
    // Step 2: Get existing data
    const [yearsResponse, classesResponse, usersResponse] = await Promise.all([
      fetch('http://localhost:3006/api/sms/academic-years', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3006/api/sms/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3006/api/users?role=student', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    const years = await yearsResponse.json();
    const classes = await classesResponse.json();
    const students = await usersResponse.json();
    
    console.log('📅 Years:', years.length);
    console.log('📚 Classes:', classes.length);
    console.log('👨‍🎓 Students:', students.length);
    
    if (years.length === 0 || classes.length === 0 || students.length === 0) {
      console.log('❌ Missing required data, cannot proceed');
      return;
    }
    
    const activeYear = years.find(y => y.isActive);
    if (!activeYear) {
      console.log('❌ No active academic year');
      return;
    }
    
    // Step 3: Create enrollments using database directly
    console.log('📝 Creating enrollments...');
    
    const enrollmentData = [];
    for (let i = 0; i < Math.min(students.length, classes.length); i++) {
      const student = students[i];
      const assignedClass = classes[i % classes.length];
      
      enrollmentData.push({
        schoolId,
        academicYearId: activeYear.id,
        studentId: student.id,
        classId: assignedClass.id,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (i % 5 === 0) {
        console.log(`✅ Created ${i} enrollments so far...`);
      }
    }
    
    // Step 4: Insert enrollments via a direct API call
    console.log('💾 Inserting enrollments into database...');
    
    const insertResponse = await fetch('http://localhost:3006/api/sms/student-enrollments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enrollments: enrollmentData
      })
    });
    
    if (insertResponse.ok) {
      const result = await insertResponse.json();
      console.log('✅ Enrollments created:', result.message || 'Success');
    } else {
      const error = await insertResponse.text();
      console.log('❌ Failed to create enrollments:', error);
    }
    
    // Step 5: Test dashboard
    console.log('📊 Testing final dashboard...');
    const dashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const dashboardData = await dashboardResponse.json();
    console.log('🎉 Final dashboard students count:', dashboardData.cards?.students);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

fixGreenwoodEnrollments();
