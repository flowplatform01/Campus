const testGreenwoodData = async () => {
  try {
    console.log('🧪 Testing Greenwood Academy data via API...');
    
    // Login as Greenwood admin
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    console.log('🔐 Login Status:', loginResponse.status);
    console.log('👤 User:', loginResult.user);
    console.log('🆔 School ID:', loginResult.user?.schoolId);
    
    if (loginResult.accessToken) {
      const token = loginResult.accessToken;
      
      // Test dashboard
      const dashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const dashboardData = await dashboardResponse.json();
      console.log('📊 Dashboard Status:', dashboardResponse.status);
      console.log('📊 Dashboard Data:', dashboardData);
      
      // Test school info
      const schoolResponse = await fetch('http://localhost:3006/api/sms/school', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const schoolData = await schoolResponse.json();
      console.log('🏫 School Status:', schoolResponse.status);
      console.log('🏫 School Data:', schoolData);
      
      // Test users list
      const usersResponse = await fetch('http://localhost:3006/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const usersData = await usersResponse.json();
      console.log('👥 Users Status:', usersResponse.status);
      console.log('👥 Users Count:', usersData.length);
      console.log('👥 First few users:', usersData.slice(0, 3));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testGreenwoodData();
