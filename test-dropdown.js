import axios from 'axios';

async function testDropdown() {
  try {
    const loginResponse = await axios.post('http://localhost:3006/api/auth/login', {
      email: 'admin.greenwood@campus-sim.edu',
      password: 'admin123456'
    });
    const token = loginResponse.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    const response = await axios.get('http://localhost:3006/api/sms/sub-roles/dropdown', { headers });
    console.log('✅ Dropdown endpoint working:', response.data);
  } catch (error) {
    console.log('❌ Dropdown endpoint error:', error.response?.data || error.message);
  }
}

testDropdown();
