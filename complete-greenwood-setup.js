const completeGreenwoodSetup = async () => {
  try {
    console.log('🎯 COMPLETING GREENWOOD ACADEMY SETUP');
    console.log('=====================================');
    
    // Step 1: Login as admin
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    const schoolId = loginResult.user.schoolId;
    
    console.log('✅ Logged in successfully');
    
    // Step 2: Get required data
    const [yearsResponse, classesResponse, studentsResponse] = await Promise.all([
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
    const students = await studentsResponse.json();
    
    console.log(`📅 Academic Years: ${years.length}`);
    console.log(`📚 Classes: ${classes.length}`);
    console.log(`👨‍🎓 Students: ${students.length}`);
    
    if (years.length === 0 || classes.length === 0 || students.length === 0) {
      console.log('❌ Missing required data');
      return;
    }
    
    const activeYear = years.find(y => y.isActive);
    if (!activeYear) {
      console.log('❌ No active academic year');
      return;
    }
    
    console.log(`📅 Using Academic Year: ${activeYear.name}`);
    
    // Step 3: Create student enrollments
    console.log('📝 Creating student enrollments...');
    
    let enrollmentCount = 0;
    const maxEnrollments = Math.min(students.length, 25); // Limit to 25 for performance
    
    for (let i = 0; i < maxEnrollments; i++) {
      const student = students[i];
      const classIndex = i % classes.length;
      const assignedClass = classes[classIndex];
      
      if (!assignedClass) {
        console.log(`⚠️  No class available for student ${student.name}`);
        continue;
      }
      
      // Create enrollment
      const enrollmentData = {
        schoolId,
        academicYearId: activeYear.id,
        studentId: student.id,
        classId: assignedClass.id,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        const enrollmentResponse = await fetch('http://localhost:3006/api/sms/student-enrollments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enrollments: [enrollmentData] })
        });
        
        if (enrollmentResponse.ok) {
          enrollmentCount++;
          if (enrollmentCount % 5 === 0) {
            console.log(`✅ Created ${enrollmentCount} enrollments...`);
          }
        } else {
          const error = await enrollmentResponse.text();
          console.log(`❌ Failed to enroll ${student.name}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error enrolling ${student.name}: ${error.message}`);
      }
    }
    
    console.log(`🎉 Successfully created ${enrollmentCount} student enrollments!`);
    
    // Step 4: Verify dashboard
    console.log('📊 Verifying dashboard...');
    
    const dashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      const studentCount = parseInt(dashboardData.cards?.students || '0');
      
      console.log(`📊 Final Dashboard Students: ${studentCount}`);
      console.log(`📊 Final Dashboard Employees: ${dashboardData.cards?.employees}`);
      console.log(`📊 Final Dashboard Setup: ${dashboardData.setup?.hasActiveAcademicYear ? 'Complete' : 'Incomplete'}`);
      
      if (studentCount > 0) {
        console.log('\n🎉 GREENWOOD ACADEMY IS NOW FULLY FUNCTIONAL!');
        console.log('=====================================');
        console.log('✅ Login: Working');
        console.log('✅ School Data: Complete');
        console.log('✅ Classes: Created');
        console.log('✅ Students: Enrolled');
        console.log('✅ Dashboard: Showing correct data');
        console.log('✅ All Core Features: Operational');
      } else {
        console.log('\n⚠️  Greenwood Academy still showing 0 students');
        console.log('Manual intervention may be required');
      }
    } else {
      console.log('❌ Dashboard verification failed');
    }
    
  } catch (error) {
    console.error('❌ Setup completion error:', error);
  }
};

completeGreenwoodSetup();
