const testClassesEndpoint = async () => {
  try {
    console.log('🧪 Testing classes endpoint directly...');
    
    // Login as admin
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    console.log('🔐 Login successful:', !!loginResult.accessToken);
    console.log('👤 User schoolId:', loginResult.user?.schoolId);
    
    const token = loginResult.accessToken;
    
    // Test classes endpoint with detailed logging
    console.log('📡 Making request to /api/sms/classes...');
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    console.log('📋 Headers:', {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    const classesResponse = await fetch('http://localhost:3006/api/sms/classes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', classesResponse.status);
    console.log('📊 Response headers:', Object.fromEntries(classesResponse.headers.entries()));
    
    const responseText = await classesResponse.text();
    console.log('📊 Response body (first 200 chars):', responseText.substring(0, 200));
    
    try {
      const classesData = JSON.parse(responseText);
      console.log('📚 Classes data:', classesData);
    } catch (e) {
      console.log('❌ Failed to parse JSON:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testClassesEndpoint();
