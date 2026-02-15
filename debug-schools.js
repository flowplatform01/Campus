import axios from 'axios';

async function debugSchoolDiscovery() {
  try {
    const response = await axios.get('http://localhost:3006/api/sms/schools/discovery');
    console.log('Response type:', typeof response.data);
    console.log('Is array?', Array.isArray(response.data));
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugSchoolDiscovery();
