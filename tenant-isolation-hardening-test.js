import fetch from 'node-fetch';

class TenantIsolationHardeningTest {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map();
    this.testResults = [];
    this.securityBreaches = [];
  }

  async login(email, password) {
    const response = await fetch(`${this.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json().catch(() => null);
    if (response.ok && result && result.accessToken) {
      return result.accessToken;
    } else {
      throw new Error(`Login failed: ${result?.message || 'Unknown error'}`);
    }
  }

  async testCrossTenantAccess(testName, attackerToken, victimSchoolId, endpoint, method = 'GET', data = null) {
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      const url = `${this.backendUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${attackerToken}`,
          'Content-Type': 'application/json'
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      // Attempt to inject victim school ID
      const testUrl = endpoint.replace(':schoolId', victimSchoolId);
      const finalUrl = `${this.backendUrl}${testUrl}`;
      
      const response = await fetch(finalUrl, options);
      const responseData = await response.json().catch(() => null);
      
      // If access is granted (200-299), this is a security breach
      if (response.status >= 200 && response.status < 300) {
        this.securityBreaches.push({
          test: testName,
          breach: 'CROSS_TENANT_ACCESS_GRANTED',
          status: response.status,
          endpoint: testUrl,
          data: responseData
        });
        console.log(`❌ ${testName}: SECURITY BREACH - Cross-tenant access granted`);
        return false;
      } else if (response.status === 403) {
        console.log(`✅ ${testName}: PROPERLY BLOCKED`);
        return true;
      } else {
        console.log(`⚠️ ${testName}: UNEXPECTED STATUS ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  async testIdInjection(testName, token, endpoint, injectedId) {
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      const url = `${this.backendUrl}${endpoint.replace(':id', injectedId)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        console.log(`✅ ${testName}: ID INJECTION BLOCKED`);
        return true;
      } else if (response.status >= 200 && response.status < 300) {
        this.securityBreaches.push({
          test: testName,
          breach: 'ID_INJECTION_SUCCESS',
          status: response.status,
          endpoint: endpoint.replace(':id', injectedId)
        });
        console.log(`❌ ${testName}: SECURITY BREACH - ID injection successful`);
        return false;
      } else {
        console.log(`⚠️ ${testName}: UNEXPECTED STATUS ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  async testParameterTampering(testName, token, endpoint, params) {
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      const url = new URL(`${this.backendUrl}${endpoint}`);
      Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
      });
      
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        console.log(`✅ ${testName}: PARAMETER TAMPERING BLOCKED`);
        return true;
      } else if (response.status >= 200 && response.status < 300) {
        this.securityBreaches.push({
          test: testName,
          breach: 'PARAMETER_TAMPERING_SUCCESS',
          status: response.status,
          endpoint: url.toString()
        });
        console.log(`❌ ${testName}: SECURITY BREACH - Parameter tampering successful`);
        return false;
      } else {
        console.log(`⚠️ ${testName}: UNEXPECTED STATUS ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  async setupTestUsers() {
    console.log('🔧 Setting up cross-tenant test users...');
    
    try {
      // School 1 users (Greenwood Academy)
      const greenwoodAdmin = await this.login('admin.greenwood@campus-sim.edu', 'admin123456');
      const greenwoodTeacher = await this.login('teacher1.greenwood-academy@campus-sim.edu', 'staff123456');
      const greenwoodStudent = await this.login('alice.johnson0.greenwood-academy@campus-sim.edu', 'student123456');
      const greenwoodParent = await this.login('parent.alice0.greenwood-academy@campus-sim.edu', 'parent123456');
      
      this.tokens.set('greenwood-admin', greenwoodAdmin);
      this.tokens.set('greenwood-teacher', greenwoodTeacher);
      this.tokens.set('greenwood-student', greenwoodStudent);
      this.tokens.set('greenwood-parent', greenwoodParent);
      
      // School 2 users (Riverside High) - if available
      try {
        const riversideAdmin = await this.login('admin.riverside@campus-sim.edu', 'admin123456');
        const riversideTeacher = await this.login('teacher1.riverside-high@campus-sim.edu', 'staff123456');
        const riversideStudent = await this.login('student1.riverside-high@campus-sim.edu', 'student123456');
        const riversideParent = await this.login('parent.student1.riverside-high@campus-sim.edu', 'parent123456');
        
        this.tokens.set('riverside-admin', riversideAdmin);
        this.tokens.set('riverside-teacher', riversideTeacher);
        this.tokens.set('riverside-student', riversideStudent);
        this.tokens.set('riverside-parent', riversideParent);
      } catch (error) {
        console.log('⚠️ Could not login to Riverside High - using Greenwood for cross-tenant tests');
      }
      
      console.log('✅ Test users setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test users:', error.message);
      throw error;
    }
  }

  async getSchoolIds() {
    console.log('🔍 Getting school IDs for testing...');
    
    const adminToken = this.tokens.get('greenwood-admin');
    const response = await fetch(`${this.backendUrl}/api/sms/school`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (response.ok) {
      const school = await response.json();
      return { greenwood: school.id, riverside: 'fake-riverside-id-for-testing' };
    } else {
      throw new Error('Could not get school ID');
    }
  }

  async runTenantIsolationTests() {
    console.log('🚀 TENANT ISOLATION HARDENING TEST');
    console.log('===================================');
    
    await this.setupTestUsers();
    const schoolIds = await this.getSchoolIds();
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Admin cross-tenant access
    totalTests++;
    if (await this.testCrossTenantAccess(
      'Admin Cross-Tenant School Access',
      this.tokens.get('greenwood-admin'),
      schoolIds.riverside,
      '/api/sms/school'
    )) testsPassed++;
    
    // Test 2: Teacher cross-tenant class access
    totalTests++;
    if (await this.testCrossTenantAccess(
      'Teacher Cross-Tenant Classes',
      this.tokens.get('greenwood-teacher'),
      schoolIds.riverside,
      '/api/sms/classes'
    )) testsPassed++;
    
    // Test 3: Student cross-tenant grades
    totalTests++;
    if (await this.testCrossTenantAccess(
      'Student Cross-Tenant Grades',
      this.tokens.get('greenwood-student'),
      schoolIds.riverside,
      '/api/academics/grades'
    )) testsPassed++;
    
    // Test 4: Parent cross-tenant announcements
    totalTests++;
    if (await this.testCrossTenantAccess(
      'Parent Cross-Tenant Announcements',
      this.tokens.get('greenwood-parent'),
      schoolIds.riverside,
      '/api/announcements'
    )) testsPassed++;
    
    // Test 5: User ID injection
    totalTests++;
    if (await this.testIdInjection(
      'User ID Injection',
      this.tokens.get('greenwood-student'),
      '/api/users/:id',
      schoolIds.riverside
    )) testsPassed++;
    
    // Test 6: School ID parameter tampering
    totalTests++;
    if (await this.testParameterTampering(
      'School ID Parameter Tampering',
      this.tokens.get('greenwood-teacher'),
      '/api/sms/classes',
      { schoolId: schoolIds.riverside }
    )) testsPassed++;
    
    // Test 7: Export cross-tenant access
    totalTests++;
    if (await this.testCrossTenantAccess(
      'Export Cross-Tenant Access',
      this.tokens.get('greenwood-admin'),
      schoolIds.riverside,
      '/api/export/student/fake-student-id/pdf'
    )) testsPassed++;
    
    // Generate report
    this.generateTenantIsolationReport(testsPassed, totalTests);
    
    return testsPassed === totalTests;
  }

  generateTenantIsolationReport(testsPassed, totalTests) {
    console.log('\n📊 TENANT ISOLATION HARDENING REPORT');
    console.log('====================================');
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Security Tests: ${totalTests}`);
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${totalTests - testsPassed}`);
    console.log(`Security Score: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (this.securityBreaches.length > 0) {
      console.log(`\n🚨 SECURITY BREACHES DETECTED (${this.securityBreaches.length}):`);
      this.securityBreaches.forEach((breach, index) => {
        console.log(`${index + 1}. ${breach.test}`);
        console.log(`   Type: ${breach.breach}`);
        console.log(`   Endpoint: ${breach.endpoint}`);
        console.log(`   Status: ${breach.status}`);
      });
    } else {
      console.log('\n✅ NO SECURITY BREACHES DETECTED');
      console.log('🔐 MULTI-TENANT ISOLATION: PROPERLY IMPLEMENTED');
    }
    
    const isSecure = this.securityBreaches.length === 0 && testsPassed === totalTests;
    console.log(`\n🏆 TENANT ISOLATION STATUS: ${isSecure ? '✅ FULLY SECURED' : '❌ VULNERABILITIES FOUND'}`);
  }
}

// Run the tenant isolation hardening test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new TenantIsolationHardeningTest();
  test.runTenantIsolationTests().then(isSecure => {
    console.log(`\n🎯 FINAL RESULT: ${isSecure ? '✅ TENANT ISOLATION HARDENED' : '❌ NEEDS ADDITIONAL WORK'}`);
    process.exit(isSecure ? 0 : 1);
  }).catch(console.error);
}

export default TenantIsolationHardeningTest;
