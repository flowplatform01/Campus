const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@campus.demo',
        password: 'Campus@12345'
      })
    });

    const result = await response.json();
    console.log('Login Response:', response.status, result);

    if (response.ok && result.accessToken) {
      console.log('✅ Login successful!');
      
      // Test getting user data
      const userResponse = await fetch('http://localhost:3006/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${result.accessToken}`
        }
      });
      
      const userData = await userResponse.json();
      console.log('User Data:', userData);
      
      // Test academic records
      const gradesResponse = await fetch('http://localhost:3006/api/academics/grades', {
        headers: {
          'Authorization': `Bearer ${result.accessToken}`
        }
      });
      
      const gradesData = await gradesResponse.json();
      console.log('Grades Response:', gradesResponse.status, gradesData);
      
    } else {
      console.log('❌ Login failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testLogin();
