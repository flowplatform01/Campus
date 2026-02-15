const testTokenValidation = async () => {
  try {
    console.log('🧪 Testing token validation...');
    
    // Login to get token
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    
    console.log('🔑 Token received:', token ? 'Yes' : 'No');
    
    // Test a simple endpoint that doesn't require staff role
    console.log('📡 Testing /api/auth/me...');
    const meResponse = await fetch('http://localhost:3006/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📊 /api/auth/me status:', meResponse.status);
    const meData = await meResponse.json();
    console.log('👤 /api/auth/me data:', meData);
    
    // Test dashboard endpoint
    console.log('📡 Testing /api/sms/dashboard...');
    const dashboardResponse = await fetch('http://localhost:3006/api/sms/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📊 /api/sms/dashboard status:', dashboardResponse.status);
    const dashboardData = await dashboardResponse.json();
    console.log('📊 Dashboard students count:', dashboardData.cards?.students);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testTokenValidation();
