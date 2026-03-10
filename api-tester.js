import fetch from 'node-fetch';

class CampusAPITester {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.frontendUrl = "http://localhost:5173";
  }

  makeUniqueEmail(prefix = "test") {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${suffix}@campus.local`;
  }

  async testAPIEndpoint(endpoint, method = 'GET', data = null, expectedStatus = 200) {
    try {
      const url = `${this.backendUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      console.log(`🧪 Testing ${method} ${endpoint}`);
      
      const response = await fetch(url, options);
      const result = {
        status: response.status,
        ok: response.ok,
        data: response.status !== 204 ? await response.json().catch(() => null) : null,
        success: response.status === expectedStatus
      };

      console.log(`${result.success ? '✅' : '❌'} ${method} ${endpoint} - Status: ${result.status}`);
      
      if (!result.success && result.data) {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
      }

      return result;
    } catch (error) {
      console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Campus School Management System API Tests...\n');

    // Test 1: Health Check
    console.log('📊 Health Check Tests');
    await this.testAPIEndpoint('/api/health', 'GET', null, 200);
    
    // Test 2: Authentication Tests
    console.log('\n🔐 Authentication Tests');
    
    // Test Registration
    const uniqueEmail = this.makeUniqueEmail("apitest");
    const registerData = {
      email: uniqueEmail,
      password: "test123456",
      name: "Test User",
      role: "admin",
      schoolName: "Test School"
    };
    await this.testAPIEndpoint('/api/auth/register', 'POST', registerData, 201);
    
    // Test Login
    const loginData = {
      email: uniqueEmail,
      password: "test123456"
    };
    const loginResult = await this.testAPIEndpoint('/api/auth/login', 'POST', loginData, 200);
    
    let authToken = null;
    if (loginResult.success && loginResult.data) {
      authToken = loginResult.data.accessToken;
      console.log(`   🔑 Got auth token: ${authToken.substring(0, 20)}...`);
    }

    // Test 3: Protected Endpoints (with auth)
    console.log('\n🔒 Protected API Tests');
    
    if (authToken) {
      const authHeaders = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      // Test authenticated endpoints
      await this.testWithAuth('/api/auth/me', 'GET', null, authHeaders);
      await this.testWithAuth('/api/academics/grades', 'GET', null, authHeaders);
      await this.testWithAuth('/api/academics/assignments', 'GET', null, authHeaders);
      await this.testWithAuth('/api/academics/attendance', 'GET', null, authHeaders);
      await this.testWithAuth('/api/sms/dashboard', 'GET', null, authHeaders);
      await this.testWithAuth('/api/sms/academic-years', 'GET', null, authHeaders);
      await this.testWithAuth('/api/sms/terms', 'GET', null, authHeaders);
      await this.testWithAuth('/api/sms/subjects', 'GET', null, authHeaders);
      await this.testWithAuth('/api/sms/classes', 'GET', null, authHeaders);
      await this.testWithAuth('/api/sms/exams', 'GET', null, authHeaders);
    } else {
      console.log('❌ Skipping protected tests - no auth token available');
    }

    // Test 4: Unprotected Endpoints
    console.log('\n🌐 Public API Tests');
    
    // Test endpoints without auth (should return 401)
    await this.testAPIEndpoint('/api/academics/grades', 'GET', null, 401);
    await this.testAPIEndpoint('/api/academics/assignments', 'GET', null, 401);
    await this.testAPIEndpoint('/api/academics/attendance', 'GET', null, 401);
    await this.testAPIEndpoint('/api/analytics/dashboard', 'GET', null, 401);

    console.log('\n✅ API Testing Complete!');
  }

  async testWithAuth(endpoint, method, data, headers) {
    try {
      const url = `${this.backendUrl}${endpoint}`;
      const options = {
        method,
        headers,
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      console.log(`🧪 Testing ${method} ${endpoint} (with auth)`);
      
      const response = await fetch(url, options);
      const result = {
        status: response.status,
        ok: response.ok,
        data: response.status !== 204 ? await response.json().catch(() => null) : null,
        success: response.ok
      };

      console.log(`${result.success ? '✅' : '❌'} ${method} ${endpoint} - Status: ${result.status}`);
      
      if (!result.success && result.data) {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
      }

      return result;
    } catch (error) {
      console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CampusAPITester();
  tester.runAllTests().catch(console.error);
}

export default CampusAPITester;
