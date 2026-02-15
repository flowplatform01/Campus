import fetch from 'node-fetch';

const API_KEY = "sk-user-QuXhtp5R_-afL0bJPJYzA-vj-NtU4cD-keuc86oVb0nStQ7NEZB-lmlXuh20BeC88P8sANxPUXdlAn4Ou7KabJyYTSw6y6NukatKQ4Ps1rLySoFiC7jwZMGnDzvjUmxwICk";
const BASE_URL = "https://api.testsprite.ai";

class PaymentSystemTester {
  constructor() {
    this.apiKey = API_KEY;
    this.baseUrl = BASE_URL;
    this.backendUrl = "http://localhost:3006";
    this.frontendUrl = "http://localhost:5173";
  }

  async testWithAuth(endpoint, method = 'GET', data = null, headers = {}) {
    try {
      const url = `${this.backendUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
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

  async runPaymentTests() {
    console.log('🔐 AUTHENTICATED PAYMENT SYSTEM TESTING');
    console.log('=====================================');
    
    // First login to get token
    const loginResponse = await fetch(`${this.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@campus.com',
        password: 'test123456'
      })
    });
    
    const loginResult = await loginResponse.json().catch(() => null);
    
    if (loginResponse.ok && loginResult && loginResult.accessToken) {
      const token = loginResult.accessToken;
      console.log('🔑 Got auth token, testing with authentication...');
      
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Test authenticated payment endpoints
      console.log('\n📋 Testing Fee Heads (Auth)');
      await this.testWithAuth('/api/sms/payments/fee-heads', 'GET', null, authHeaders);
      
      console.log('\n🧾 Testing Invoices (Auth)');
      await this.testWithAuth('/api/sms/payments/invoices', 'GET', null, authHeaders);
      
      console.log('\n⚙️ Testing Payment Settings (Auth)');
      await this.testWithAuth('/api/sms/payments/settings', 'GET', null, authHeaders);
      
      console.log('\n💰 Testing Invoice Creation (Auth)');
      await this.testWithAuth('/api/sms/payments/invoices', 'POST', {
        studentId: 'test-student-id',
        lines: [{
          description: 'Test Fee',
          amount: 100
        }]
      }, authHeaders);
      
      console.log('\n📝 Testing Fee Head Creation (Auth)');
      await this.testWithAuth('/api/sms/payments/fee-heads', 'POST', {
        name: 'Test Fee Head',
        code: 'TEST'
      }, authHeaders);
      
    } else {
      console.log('❌ Login failed, cannot test authenticated endpoints');
      console.log('Login Response:', loginResult);
    }
    
    console.log('\n✅ Authenticated Payment Tests Complete!');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PaymentSystemTester();
  tester.runPaymentTests().catch(console.error);
}

export default PaymentSystemTester;
