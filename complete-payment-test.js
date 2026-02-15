import fetch from 'node-fetch';

class CompletePaymentSystemTest {
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

  async createStudent() {
    console.log('👨‍🎓 Creating test student...');
    
    const studentData = {
      email: 'student@campus.com',
      password: 'student123456',
      name: 'Test Student',
      role: 'student',
      studentId: 'STU001'
    };
    
    const response = await fetch(`${this.backendUrl}/api/users`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(studentData)
    });
    
    const result = await response.json().catch(() => null);
    
    if (response.status === 201) {
      console.log('✅ Student created successfully');
      console.log('Student ID:', result.id);
      return result.id;
    } else {
      console.log('❌ Failed to create student:', result);
      return null;
    }
  }

  async testCompletePaymentFlow(studentId) {
    console.log('\n💳 COMPLETE PAYMENT FLOW TEST');
    console.log('=================================');

    // 1. Create fee head
    console.log('\n1️⃣ Creating fee head...');
    const feeHeadResponse = await fetch(`${this.backendUrl}/api/sms/payments/fee-heads`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({
        name: 'Tuition Fee',
        code: 'TUITION'
      })
    });
    
    const feeHead = await feeHeadResponse.json().catch(() => null);
    if (feeHeadResponse.status === 201) {
      console.log('✅ Fee head created:', feeHead.id);
    } else {
      console.log('❌ Fee head creation failed:', feeHead);
      return;
    }

    // 2. Create invoice
    console.log('\n2️⃣ Creating invoice...');
    const invoiceData = {
      studentId: studentId,
      lines: [{
        feeHeadId: feeHead.id,
        description: 'Monthly Tuition Fee',
        amount: 500
      }]
    };
    
    const invoiceResponse = await fetch(`${this.backendUrl}/api/sms/payments/invoices`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(invoiceData)
    });
    
    const invoice = await invoiceResponse.json().catch(() => null);
    if (invoiceResponse.status === 201) {
      console.log('✅ Invoice created:', invoice.id);
      console.log('Invoice details:', {
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        studentId: invoice.studentId
      });
    } else {
      console.log('❌ Invoice creation failed:', invoice);
      return;
    }

    // 3. Record payment
    console.log('\n3️⃣ Recording payment...');
    const paymentData = {
      invoiceId: invoice.id,
      amount: 250,
      method: 'cash',
      reference: 'PAY-001'
    };
    
    const paymentResponse = await fetch(`${this.backendUrl}/api/sms/payments/payments`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
    
    const payment = await paymentResponse.json().catch(() => null);
    if (paymentResponse.status === 201) {
      console.log('✅ Payment recorded:', payment.id);
    } else {
      console.log('❌ Payment recording failed:', payment);
      return;
    }

    // 4. Check student balance
    console.log('\n4️⃣ Checking student balance...');
    const balanceResponse = await fetch(`${this.backendUrl}/api/sms/payments/students/${studentId}/balance`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    const balance = await balanceResponse.json().catch(() => null);
    if (balanceResponse.status === 200) {
      console.log('✅ Balance retrieved:');
      console.log('  Invoiced:', balance.invoiced);
      console.log('  Paid:', balance.paid);
      console.log('  Balance:', balance.balance);
    } else {
      console.log('❌ Balance check failed:', balance);
    }

    // 5. Get invoice details
    console.log('\n5️⃣ Getting invoice details...');
    const invoiceDetailResponse = await fetch(`${this.backendUrl}/api/sms/payments/invoices/${invoice.id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    const invoiceDetail = await invoiceDetailResponse.json().catch(() => null);
    if (invoiceDetailResponse.status === 200) {
      console.log('✅ Invoice details retrieved:');
      console.log('  Status:', invoiceDetail.invoice.status);
      console.log('  Total:', invoiceDetail.invoice.totalAmount);
      console.log('  Payments:', invoiceDetail.payments.length);
    } else {
      console.log('❌ Invoice details failed:', invoiceDetail);
    }

    console.log('\n✅ Complete payment flow test finished!');
  }

  async runFullTest() {
    console.log('🎯 COMPLETE PAYMENT SYSTEM TEST');
    console.log('================================');

    // Login
    if (!await this.login()) {
      return;
    }

    // Create student
    const studentId = await this.createStudent();
    if (!studentId) {
      return;
    }

    // Test complete payment flow
    await this.testCompletePaymentFlow(studentId);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CompletePaymentSystemTest();
  tester.runFullTest().catch(console.error);
}

export default CompletePaymentSystemTest;
