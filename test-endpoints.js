import axios from 'axios';

async function testEndpoints() {
  try {
    const loginResponse = await axios.post('http://localhost:3006/api/auth/login', {
      email: 'admin.greenwood@campus-sim.edu',
      password: 'admin123456'
    });
    const token = loginResponse.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test existing sub-roles endpoint
    console.log('Testing /api/sms/sub-roles...');
    try {
      const response = await axios.get('http://localhost:3006/api/sms/sub-roles', { headers });
      console.log('✅ /api/sms/sub-roles working:', response.data.length, 'sub-roles found');
    } catch (error) {
      console.log('❌ /api/sms/sub-roles error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test dropdown endpoint
    console.log('Testing /api/sms/sub-roles/dropdown...');
    try {
      const response = await axios.get('http://localhost:3006/api/sms/sub-roles/dropdown', { headers });
      console.log('✅ /api/sms/sub-roles/dropdown working:', response.data);
    } catch (error) {
      console.log('❌ /api/sms/sub-roles/dropdown error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
  }
}

testEndpoints();
