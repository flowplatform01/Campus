import fetch from 'node-fetch';

class ComprehensivePaymentTester {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.token = null;
  }

  async login() {
    const response = await fetch(`${this.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@campus.com',
        password: 'test123456'
      })
    });
    
    const result = await response.json().catch(() => null);
    if (response.ok && result && result.accessToken) {
      this.token = result.accessToken;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', result);
      return false;
    }
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
    const headers = await this.getAuthHeaders();
    const url = `${this.backendUrl}${endpoint}`;
    
    const options = {
      method,
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`🧪 ${method} ${endpoint}`);
      const response = await fetch(url, options);
      const result = await response.json().catch(() => null);
      
      const success = response.status === expectedStatus;
      console.log(`${success ? '✅' : '❌'} Status: ${response.status}`);
      
      if (!success && result) {
        console.log(`   Error: ${result.message || JSON.stringify(result)}`);
      }
      
      return { success, status: response.status, data: result };
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runComprehensiveTests() {
    console.log('🏫 COMPREHENSIVE PAYMENT SYSTEM ANALYSIS');
    console.log('==========================================');

    // Login first
    if (!await this.login()) {
      return;
    }

    // Get users to find valid student ID
    console.log('\n👥 Getting users...');
    const usersResponse = await this.testEndpoint('GET', '/api/users');
    
    if (usersResponse.success && usersResponse.data) {
      const student = usersResponse.data.find(u => u.role === 'student');
      const admin = usersResponse.data.find(u => u.role === 'admin');
      
      console.log(`Found ${usersResponse.data.length} users`);
      if (student) {
        console.log(`Student: ${student.name} (${student.id})`);
      }
      if (admin) {
        console.log(`Admin: ${admin.name} (${admin.id})`);
      }

      // Test payment system components
      await this.testPaymentComponents(student ? student.id : null);
    }

    console.log('\n✅ Comprehensive Analysis Complete!');
  }

  async testPaymentComponents(studentId) {
    console.log('\n💳 PAYMENT SYSTEM COMPONENTS');
    console.log('==============================');

    // Test 1: Fee Heads
    console.log('\n📋 Fee Heads Management');
    await this.testEndpoint('GET', '/api/sms/payments/fee-heads');
    
    // Create a fee head
    const feeHeadResult = await this.testEndpoint('POST', '/api/sms/payments/fee-heads', {
      name: 'Test Fee Head',
      code: 'TEST'
    }, 201);
    
    let feeHeadId = null;
    if (feeHeadResult.success && feeHeadResult.data) {
      feeHeadId = feeHeadResult.data.id;
      console.log(`Created fee head: ${feeHeadId}`);
    }

    // Test 2: Payment Settings
    console.log('\n⚙️ Payment Settings');
    await this.testEndpoint('GET', '/api/sms/payments/settings');
    
    // Update payment settings
    await this.testEndpoint('PATCH', '/api/sms/payments/settings', {
      currency: 'USD',
      methods: ['cash', 'bank_transfer', 'card']
    });

    // Test 3: Invoice Management
    console.log('\n🧾 Invoice Management');
    await this.testEndpoint('GET', '/api/sms/payments/invoices');
    
    if (studentId) {
      // Create invoice with valid student ID
      const invoiceData = {
        studentId: studentId,
        lines: [{
          feeHeadId: feeHeadId,
          description: 'Test Tuition Fee',
          amount: 500
        }]
      };
      
      const invoiceResult = await this.testEndpoint('POST', '/api/sms/payments/invoices', invoiceData, 201);
      
      let invoiceId = null;
      if (invoiceResult.success && invoiceResult.data) {
        invoiceId = invoiceResult.data.id;
        console.log(`Created invoice: ${invoiceId}`);
        
        // Test 4: Payment Processing
        console.log('\n💰 Payment Processing');
        const paymentData = {
          invoiceId: invoiceId,
          amount: 250,
          method: 'cash',
          reference: 'TEST-001'
        };
        
        await this.testEndpoint('POST', '/api/sms/payments/payments', paymentData, 201);
        
        // Test 5: Student Balance
        console.log('\n📊 Student Balance');
        await this.testEndpoint('GET', `/api/sms/payments/students/${studentId}/balance`);
        
        // Test 6: Invoice Details
        console.log('\n📄 Invoice Details');
        await this.testEndpoint('GET', `/api/sms/payments/invoices/${invoiceId}`);
      }
    } else {
      console.log('⚠️ No student found - skipping invoice/payment tests');
    }

    // Test 7: Expenses (Admin only)
    console.log('\n💸 Expense Management');
    await this.testEndpoint('GET', '/api/sms/expenses');
    
    // Create expense
    await this.testEndpoint('POST', '/api/sms/expenses', {
      category: 'utility',
      title: 'Test Electricity Bill',
      amount: 150,
      date: new Date().toISOString(),
      notes: 'Monthly electricity bill'
    }, 201);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensivePaymentTester();
  tester.runComprehensiveTests().catch(console.error);
}

export default ComprehensivePaymentTester;
