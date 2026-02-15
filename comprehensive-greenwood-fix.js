const comprehensiveFix = async () => {
  try {
    console.log('🔧 COMPREHENSIVE GREENWOOD ACADEMY FIX');
    console.log('==========================================');
    
    // Step 1: Test current state
    console.log('\n📊 Step 1: Testing current state...');
    
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', await loginResponse.text());
      return;
    }
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    const schoolId = loginResult.user.schoolId;
    
    console.log('✅ Login successful');
    console.log('🆔 School ID:', schoolId);
    console.log('👤 User data:', loginResult.user);
    
    // Step 2: Test if token works for simple endpoints
    console.log('\n🧪 Step 2: Testing token validation...');
    
    const [meResponse, dashboardResponse] = await Promise.all([
      fetch('http://localhost:3006/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3006/api/sms/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    const meData = await meResponse.json();
    const dashboardData = await dashboardResponse.json();
    
    console.log('📊 /api/auth/me status:', meResponse.status);
    console.log('📊 /api/sms/dashboard status:', dashboardResponse.status);
    console.log('📊 Dashboard students:', dashboardData.cards?.students);
    
    // Step 3: Create missing structure if needed
    if (!dashboardData.cards || parseInt(dashboardData.cards?.students || '0') === 0) {
      console.log('\n🔨 Step 3: Creating missing academic structure...');
      
      // Create classes first
      console.log('📚 Creating classes...');
      const classCreationPromises = [];
      
      for (let i = 1; i <= 5; i++) {
        const classPromise = fetch('http://localhost:3006/api/sms/classes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Grade ${i}`,
            sortOrder: i
          })
        });
        classCreationPromises.push(classPromise);
      }
      
      const classResults = await Promise.allSettled(classCreationPromises);
      const successfulClasses = classResults.filter(r => r.status === 'fulfilled' && r.value.ok);
      console.log(`✅ Created ${successfulClasses.length} out of 5 classes`);
      
      if (successfulClasses.length === 0) {
        console.log('❌ Failed to create any classes');
        return;
      }
      
      // Get students and create enrollments
      console.log('👨‍🎓 Creating student enrollments...');
      const usersResponse = await fetch('http://localhost:3006/api/users?role=student', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!usersResponse.ok) {
        console.log('❌ Failed to get students');
        return;
      }
      
      const students = await usersResponse.json();
      console.log(`📊 Found ${students.length} students`);
      
      // Create enrollments using the working endpoint pattern
      const enrollmentPromises = students.slice(0, 10).map(async (student, index) => {
        return fetch('http://localhost:3006/api/sms/student-enrollments/bulk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            enrollments: [{
              studentId: student.id,
              classId: `Grade ${(index % 5) + 1}`, // This should match created classes
              status: 'active'
            }]
          })
        });
      });
      
      const enrollmentResults = await Promise.allSettled(enrollmentPromises);
      const successfulEnrollments = enrollmentResults.filter(r => r.status === 'fulfilled' && r.value.ok);
      console.log(`✅ Created ${successfulEnrollments.length} student enrollments`);
    }
    
    // Step 4: Final verification
    console.log('\n🎯 Step 4: Final verification...');
    
    const finalDashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const finalDashboardData = await finalDashboardResponse.json();
    console.log('🎉 FINAL Dashboard students count:', finalDashboardData.cards?.students);
    console.log('🎉 FINAL Dashboard employees count:', finalDashboardData.cards?.employees);
    console.log('🎉 FINAL Dashboard setup status:', finalDashboardData.setup);
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('================');
    console.log(`✅ Login: Working`);
    console.log(`✅ Auth schoolId: ${schoolId ? 'Present' : 'Missing'}`);
    console.log(`✅ Students in dashboard: ${finalDashboardData.cards?.students || '0'}`);
    console.log(`✅ Employees in dashboard: ${finalDashboardData.cards?.employees || '0'}`);
    console.log(`✅ Classes: ${finalDashboardData.setup?.hasActiveAcademicYear ? 'Available' : 'Missing'}`);
    
    if (parseInt(finalDashboardData.cards?.students || '0') > 0) {
      console.log('\n🎉 GREENWOOD ACADEMY IS NOW FULLY FUNCTIONAL!');
    } else {
      console.log('\n⚠️  Greenwood Academy still needs manual intervention');
    }
    
  } catch (error) {
    console.error('❌ Comprehensive fix error:', error);
  }
};

comprehensiveFix();
