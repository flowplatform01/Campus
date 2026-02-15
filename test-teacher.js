const testTeacherLogin = async () => {
  try {
    console.log('🧪 Testing teacher login and academic records...');
    
    // Login as teacher
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'teacher@campus.demo',
        password: 'Campus@12345'
      })
    });

    const loginResult = await loginResponse.json();
    
    if (loginResponse.ok && loginResult.accessToken) {
      console.log('✅ Teacher login successful!');
      console.log('Teacher:', loginResult.user);
      
      const token = loginResult.accessToken;
      
      // Test academic records (teacher should see student grades)
      const gradesResponse = await fetch('http://localhost:3006/api/academics/grades', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const gradesData = await gradesResponse.json();
      console.log('📚 Grades Response:', gradesResponse.status, gradesData);
      
      // Test academic years (teacher should have access)
      const yearsResponse = await fetch('http://localhost:3006/api/sms/academic-years', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const yearsData = await yearsResponse.json();
      console.log('📅 Academic Years:', yearsResponse.status, yearsData);
      
    } else {
      console.log('❌ Teacher login failed:', loginResult.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testTeacherLogin();
