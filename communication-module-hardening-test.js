import fetch from 'node-fetch';

class CommunicationModuleHardeningTest {
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

  async testSocialFeedAccess(testName, userToken, expectedVisibility) {
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      const response = await fetch(`${this.backendUrl}/api/social/posts`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data.posts || [];
        
        // Check if posts respect visibility rules
        const hasCrossSchoolPosts = posts.some(post => 
          post.visibility === 'school' && post.schoolName !== 'Greenwood Academy'
        );
        
        if (hasCrossSchoolPosts) {
          this.securityBreaches.push({
            test: testName,
            breach: 'CROSS_SCHOOL_POST_VISIBILITY',
            count: posts.filter(p => p.visibility === 'school' && p.schoolName !== 'Greenwood Academy').length
          });
          console.log(`❌ ${testName}: SECURITY BREACH - Cross-school posts visible`);
          return false;
        }
        
        console.log(`✅ ${testName}: Feed properly isolated (${posts.length} posts)`);
        return true;
      } else {
        console.log(`❌ ${testName}: Request failed (${response.status})`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  async testPostCreation(testName, userToken, postData, expectedSuccess) {
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      const response = await fetch(`${this.backendUrl}/api/social/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });
      
      const success = response.ok;
      const expectedStatus = expectedSuccess ? 201 : 403;
      
      if (success === expectedSuccess) {
        console.log(`✅ ${testName}: Post creation ${expectedSuccess ? 'allowed' : 'blocked'} as expected`);
        return true;
      } else {
        const actualStatus = response.status;
        console.log(`❌ ${testName}: Expected ${expectedStatus}, got ${actualStatus}`);
        
        if (success && !expectedSuccess) {
          this.securityBreaches.push({
            test: testName,
            breach: 'UNAUTHORIZED_POST_CREATION',
            status: actualStatus
          });
        }
        
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  async testCrossTenantPostAccess(testName, attackerToken, victimSchoolId) {
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Try to access posts from another school
      const response = await fetch(`${this.backendUrl}/api/social/posts?schoolId=${victimSchoolId}`, {
        headers: { 'Authorization': `Bearer ${attackerToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data.posts || [];
        
        // If any posts returned, check if they're from wrong school
        const hasWrongSchoolPosts = posts.some(post => post.schoolId === victimSchoolId);
        
        if (hasWrongSchoolPosts) {
          this.securityBreaches.push({
            test: testName,
            breach: 'CROSS_TENANT_POST_ACCESS',
            wrongSchoolPosts: posts.filter(p => p.schoolId === victimSchoolId).length
          });
          console.log(`❌ ${testName}: SECURITY BREACH - Cross-tenant posts accessible`);
          return false;
        }
        
        console.log(`✅ ${testName}: Cross-tenant access properly blocked`);
        return true;
      } else if (response.status === 403) {
        console.log(`✅ ${testName}: Cross-tenant access blocked`);
        return true;
      } else {
        console.log(`⚠️ ${testName}: Unexpected status ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  async setupTestUsers() {
    console.log('🔧 Setting up test users for communication module...');
    
    try {
      const adminToken = await this.login('admin.greenwood@campus-sim.edu', 'admin123456');
      const teacherToken = await this.login('teacher1.greenwood-academy@campus-sim.edu', 'staff123456');
      const studentToken = await this.login('alice.johnson0.greenwood-academy@campus-sim.edu', 'student123456');
      const parentToken = await this.login('parent.alice0.greenwood-academy@campus-sim.edu', 'parent123456');
      
      this.tokens.set('admin', adminToken);
      this.tokens.set('teacher', teacherToken);
      this.tokens.set('student', studentToken);
      this.tokens.set('parent', parentToken);
      
      console.log('✅ Test users setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test users:', error.message);
      throw error;
    }
  }

  async runCommunicationTests() {
    console.log('🚀 COMMUNICATION MODULE HARDENING TEST');
    console.log('======================================');
    
    await this.setupTestUsers();
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Admin feed access
    totalTests++;
    if (await this.testSocialFeedAccess(
      'Admin Social Feed',
      this.tokens.get('admin'),
      'all'
    )) testsPassed++;
    
    // Test 2: Teacher feed access
    totalTests++;
    if (await this.testSocialFeedAccess(
      'Teacher Social Feed',
      this.tokens.get('teacher'),
      'school_and_public'
    )) testsPassed++;
    
    // Test 3: Student feed access
    totalTests++;
    if (await this.testSocialFeedAccess(
      'Student Social Feed',
      this.tokens.get('student'),
      'school_and_public'
    )) testsPassed++;
    
    // Test 4: Parent feed access
    totalTests++;
    if (await this.testSocialFeedAccess(
      'Parent Social Feed',
      this.tokens.get('parent'),
      'public_only'
    )) testsPassed++;
    
    // Test 5: Admin post creation (allowed)
    totalTests++;
    if (await this.testPostCreation(
      'Admin School Post',
      this.tokens.get('admin'),
      { content: 'Admin test post', visibility: 'school', category: 'announcements' },
      true
    )) testsPassed++;
    
    // Test 6: Teacher post creation (allowed)
    totalTests++;
    if (await this.testPostCreation(
      'Teacher Class Post',
      this.tokens.get('teacher'),
      { content: 'Teacher test post', visibility: 'class', category: 'discussions' },
      true
    )) testsPassed++;
    
    // Test 7: Student post creation (allowed)
    totalTests++;
    if (await this.testPostCreation(
      'Student Public Post',
      this.tokens.get('student'),
      { content: 'Student test post', visibility: 'public', category: 'discussions' },
      true
    )) testsPassed++;
    
    // Test 8: Parent post creation (should be blocked)
    totalTests++;
    if (await this.testPostCreation(
      'Parent Post Creation',
      this.tokens.get('parent'),
      { content: 'Parent test post', visibility: 'public', category: 'discussions' },
      false
    )) testsPassed++;
    
    // Test 9: Cross-tenant post access
    totalTests++;
    if (await this.testCrossTenantPostAccess(
      'Cross-Tenant Post Access',
      this.tokens.get('student'),
      'fake-school-id'
    )) testsPassed++;
    
    // Generate report
    this.generateCommunicationReport(testsPassed, totalTests);
    
    return testsPassed === totalTests;
  }

  generateCommunicationReport(testsPassed, totalTests) {
    console.log('\n📊 COMMUNICATION MODULE HARDENING REPORT');
    console.log('==========================================');
    
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
        if (breach.count) console.log(`   Count: ${breach.count}`);
        if (breach.status) console.log(`   Status: ${breach.status}`);
      });
    } else {
      console.log('\n✅ NO SECURITY BREACHES DETECTED');
      console.log('🔐 COMMUNICATION MODULE: PROPERLY ISOLATED');
    }
    
    const isSecure = this.securityBreaches.length === 0 && testsPassed === totalTests;
    console.log(`\n🏆 COMMUNICATION STATUS: ${isSecure ? '✅ FULLY HARDENED' : '❌ VULNERABILITIES FOUND'}`);
  }
}

// Run the communication module hardening test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new CommunicationModuleHardeningTest();
  test.runCommunicationTests().then(isSecure => {
    console.log(`\n🎯 FINAL RESULT: ${isSecure ? '✅ COMMUNICATION MODULE HARDENED' : '❌ COMMUNICATION NEEDS WORK'}`);
    process.exit(isSecure ? 0 : 1);
  }).catch(console.error);
}

export default CommunicationModuleHardeningTest;
