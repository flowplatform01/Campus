const debugClassesEndpoint = async () => {
  try {
    console.log('🔍 Debugging classes endpoint...');
    
    // Login
    const loginResponse = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' })
    });
    
    const loginResult = await loginResponse.json();
    const token = loginResult.accessToken;
    
    console.log('🔑 Token obtained');
    
    // Test classes endpoint with detailed logging
    console.log('📡 Making request to /api/sms/classes...');
    
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
    console.log('📊 Raw response (first 500 chars):', responseText.substring(0, 500));
    
    try {
      const classesData = JSON.parse(responseText);
      console.log('📚 Parsed classes:', classesData);
    } catch (e) {
      console.log('❌ JSON parse error:', e.message);
      console.log('📊 Response appears to be HTML, not JSON');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

debugClassesEndpoint();
