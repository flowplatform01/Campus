const checkEnrollments = async () => {
  try {
    console.log('🔍 Checking Greenwood Academy student enrollments...');
    
    // Login as admin
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    const schoolId = loginResult.user.schoolId;
    
    console.log('🏫 School ID:', schoolId);
    
    // Check academic years
    const yearsResponse = await fetch('http://localhost:3006/api/sms/academic-years', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const yearsData = await yearsResponse.json();
    console.log('📅 Academic Years:', yearsData);
    
    // Check classes
    const classesResponse = await fetch('http://localhost:3006/api/sms/classes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const classesData = await classesResponse.json();
    console.log('📚 Classes:', classesData);
    
    // Check enrollments directly via API
    const enrollmentsResponse = await fetch('http://localhost:3006/api/sms/student-enrollments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const enrollmentsData = await enrollmentsResponse.json();
    console.log('📝 Enrollments:', enrollmentsData);
    
    // Check students by role
    const usersResponse = await fetch('http://localhost:3006/api/users?role=student', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const studentsData = await usersResponse.json();
    console.log('👨‍🎓 Students by role:', studentsData.length, 'students');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkEnrollments();
