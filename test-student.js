const testStudentLogin = async () => {
  try {
    console.log('🧪 Testing student login and academic records...');
    
    // Login as student
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@campus.demo',
        password: 'Campus@12345'
      })
    });

    const loginResult = await loginResponse.json();
    
    if (loginResponse.ok && loginResult.accessToken) {
      console.log('✅ Student login successful!');
      console.log('Student:', loginResult.user);
      
      const token = loginResult.accessToken;
      
      // Test academic records
      const gradesResponse = await fetch('http://localhost:3006/api/academics/grades', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const gradesData = await gradesResponse.json();
      console.log('📚 Grades Response:', gradesResponse.status, gradesData);
      
      // Test academic years
      const yearsResponse = await fetch('http://localhost:3006/api/sms/academic-years', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const yearsData = await yearsResponse.json();
      console.log('📅 Academic Years:', yearsResponse.status, yearsData);
      
      // Test assignments
      const assignmentsResponse = await fetch('http://localhost:3006/api/academics/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const assignmentsData = await assignmentsResponse.json();
      console.log('📝 Assignments:', assignmentsResponse.status, assignmentsData);
      
    } else {
      console.log('❌ Student login failed:', loginResult.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testStudentLogin();
