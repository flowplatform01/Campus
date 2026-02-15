import fetch from 'node-fetch';

class SystemWideHardRetest {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map();
    this.testResults = [];
    this.flowResults = [];
    this.criticalFailures = [];
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

  async testFlow(flowName, testSteps) {
    console.log(`🔄 Testing ${flowName}...`);
    
    const flowResult = {
      flow: flowName,
      steps: [],
      passed: 0,
      failed: 0,
      critical: false,
      errors: []
    };
    
    for (const step of testSteps) {
      try {
        const result = await this.executeStep(step);
        flowResult.steps.push({
          name: step.name,
          status: result.success ? 'PASS' : 'FAIL',
          details: result.details,
          error: result.error
        });
        
        if (result.success) {
          flowResult.passed++;
        } else {
          flowResult.failed++;
          flowResult.errors.push(`${step.name}: ${result.error}`);
          
          if (step.critical) {
            flowResult.critical = true;
            this.criticalFailures.push({
              flow: flowName,
              step: step.name,
              error: result.error
            });
          }
        }
      } catch (error) {
        flowResult.steps.push({
          name: step.name,
          status: 'ERROR',
          error: error.message
        });
        flowResult.failed++;
        flowResult.errors.push(`${step.name}: ${error.message}`);
        
        if (step.critical) {
          flowResult.critical = true;
          this.criticalFailures.push({
            flow: flowName,
            step: step.name,
            error: error.message
          });
        }
      }
    }
    
    this.flowResults.push(flowResult);
    const successRate = (flowResult.passed / testSteps.length) * 100;
    
    console.log(`${flowResult.critical ? '🚨' : successRate === 100 ? '✅' : '⚠️'} ${flowName}: ${flowResult.passed}/${testSteps.length} steps passed (${successRate.toFixed(1)}%)`);
    
    return flowResult;
  }

  async executeStep(step) {
    const token = this.tokens.get(step.role);
    if (!token) {
      throw new Error(`No token available for role: ${step.role}`);
    }
    
    const url = `${this.backendUrl}${step.endpoint}`;
    const options = {
      method: step.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    };
    
    if (step.body) {
      options.body = JSON.stringify(step.body);
    }
    
    const response = await fetch(url, options);
    const responseData = await response.json().catch(() => null);
    
    if (step.expectedStatus) {
      const success = response.status === step.expectedStatus;
      return {
        success,
        details: {
          status: response.status,
          expected: step.expectedStatus,
          response: responseData
        },
        error: success ? null : `Expected ${step.expectedStatus}, got ${response.status}`
      };
    } else {
      const success = response.ok;
      return {
        success,
        details: {
          status: response.status,
          response: responseData
        },
        error: success ? null : `Request failed with status ${response.status}`
      };
    }
  }

  async setupTestUsers() {
    console.log('🔧 Setting up test users for system-wide retest...');
    
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

  async runSystemWideRetest() {
    console.log('🚀 SYSTEM-WIDE HARD RETEST');
    console.log('============================');
    
    await this.setupTestUsers();
    
    // 🔄 FLOW 1: AUTHENTICATION & USER MANAGEMENT
    await this.testFlow('Authentication & User Management', [
      {
        name: 'Admin Login',
        role: 'admin',
        endpoint: '/api/auth/login',
        method: 'POST',
        body: { email: 'admin.greenwood@campus-sim.edu', password: 'admin123456' },
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Teacher Login',
        role: 'teacher',
        endpoint: '/api/auth/login',
        method: 'POST',
        body: { email: 'teacher1.greenwood-academy@campus-sim.edu', password: 'staff123456' },
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Student Login',
        role: 'student',
        endpoint: '/api/auth/login',
        method: 'POST',
        body: { email: 'alice.johnson0.greenwood-academy@campus-sim.edu', password: 'student123456' },
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Parent Login',
        role: 'parent',
        endpoint: '/api/auth/login',
        method: 'POST',
        body: { email: 'parent.alice0.greenwood-academy@campus-sim.edu', password: 'parent123456' },
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Users List',
        role: 'admin',
        endpoint: '/api/users',
        expectedStatus: 200,
        critical: true
      }
    ]);
    
    // 🔄 FLOW 2: ACADEMIC WORKFLOW
    await this.testFlow('Academic Workflow', [
      {
        name: 'Get Academic Years',
        role: 'admin',
        endpoint: '/api/sms/academic-years',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Classes',
        role: 'teacher',
        endpoint: '/api/sms/classes',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Subjects',
        role: 'teacher',
        endpoint: '/api/sms/subjects',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Student Grades',
        role: 'student',
        endpoint: '/api/academics/grades',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Student Attendance',
        role: 'student',
        endpoint: '/api/academics/attendance',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Student Assignments',
        role: 'student',
        endpoint: '/api/academics/assignments',
        expectedStatus: 200,
        critical: true
      }
    ]);
    
    // 🔄 FLOW 3: ENROLLMENT WORKFLOW
    await this.testFlow('Enrollment Workflow', [
      {
        name: 'Get Enrollment Dashboard',
        role: 'admin',
        endpoint: '/api/enrollment/dashboard',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Auto-Enroll Students',
        role: 'admin',
        endpoint: '/api/enrollment/auto-enroll',
        method: 'POST',
        expectedStatus: 200,
        critical: false
      }
    ]);
    
    // 🔄 FLOW 4: RELATIONSHIP LINKING WORKFLOW
    await this.testFlow('Relationship Linking Workflow', [
      {
        name: 'Get Parent-Student Dashboard',
        role: 'admin',
        endpoint: '/api/relationships/parent-student/parent-linking-dashboard',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Teacher Assignments Dashboard',
        role: 'admin',
        endpoint: '/api/relationships/teacher-class/teacher-assignments-dashboard',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Parent Children',
        role: 'parent',
        endpoint: '/api/relationships/parent-student/my-children',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Teacher Assignments',
        role: 'teacher',
        endpoint: '/api/relationships/teacher-class/my-assignments',
        expectedStatus: 200,
        critical: true
      }
    ]);
    
    // 🔄 FLOW 5: COMMUNICATION WORKFLOW
    await this.testFlow('Communication Workflow', [
      {
        name: 'Get Social Feed',
        role: 'student',
        endpoint: '/api/social/posts',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Create Post',
        role: 'admin',
        endpoint: '/api/social/posts',
        method: 'POST',
        body: { content: 'System test post', visibility: 'school', category: 'announcements' },
        expectedStatus: 201,
        critical: true
      },
      {
        name: 'Get Announcements',
        role: 'parent',
        endpoint: '/api/announcements',
        expectedStatus: 200,
        critical: true
      }
    ]);
    
    // 🔄 FLOW 6: PAYMENT WORKFLOW
    await this.testFlow('Payment Workflow', [
      {
        name: 'Get Fee Heads',
        role: 'admin',
        endpoint: '/api/sms/payments/fee-heads',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Payment Settings',
        role: 'admin',
        endpoint: '/api/sms/payments/settings',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Invoices',
        role: 'admin',
        endpoint: '/api/sms/payments/invoices',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Get Student Balance',
        role: 'admin',
        endpoint: '/api/sms/payments/students/fake-student-id/balance',
        expectedStatus: 404,
        critical: false
      }
    ]);
    
    // 🔄 FLOW 7: EXPORT WORKFLOW
    await this.testFlow('Export Workflow', [
      {
        name: 'Get School Info',
        role: 'admin',
        endpoint: '/api/sms/school',
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Export Student PDF',
        role: 'admin',
        endpoint: '/api/export/student/fake-student-id/pdf',
        expectedStatus: 404,
        critical: false
      },
      {
        name: 'Export Class Excel',
        role: 'admin',
        endpoint: '/api/export/class/fake-class-id/excel',
        expectedStatus: 404,
        critical: false
      },
      {
        name: 'Export Assignments CSV',
        role: 'admin',
        endpoint: '/api/export/assignments/csv',
        expectedStatus: 200,
        critical: true
      }
    ]);
    
    // 🔄 FLOW 8: ANALYTICS WORKFLOW
    await this.testFlow('Analytics Workflow', [
      {
        name: 'Get Analytics Dashboard',
        role: 'admin',
        endpoint: '/api/analytics/dashboard',
        expectedStatus: 200,
        critical: true
      }
    ]);
    
    // 🔄 FLOW 9: MULTI-TENANT ISOLATION
    await this.testFlow('Multi-Tenant Isolation', [
      {
        name: 'Cross-Tenant School Access',
        role: 'admin',
        endpoint: '/api/sms/school?schoolId=fake-school-id',
        expectedStatus: 403,
        critical: true
      },
      {
        name: 'Cross-Tenant User Access',
        role: 'teacher',
        endpoint: '/api/users?schoolId=fake-school-id',
        expectedStatus: 403,
        critical: true
      },
      {
        name: 'Cross-Tenant Grades Access',
        role: 'student',
        endpoint: '/api/academics/grades?schoolId=fake-school-id',
        expectedStatus: 403,
        critical: true
      }
    ]);
    
    // Generate comprehensive report
    this.generateSystemWideReport();
    
    return this.criticalFailures.length === 0;
  }

  generateSystemWideReport() {
    console.log('\n📊 SYSTEM-WIDE HARD RETEST REPORT');
    console.log('===================================');
    
    const totalFlows = this.flowResults.length;
    const passedFlows = this.flowResults.filter(f => !f.critical).length;
    const totalSteps = this.flowResults.reduce((sum, f) => sum + f.steps.length, 0);
    const passedSteps = this.flowResults.reduce((sum, f) => sum + f.passed, 0);
    
    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`Total Flows Tested: ${totalFlows}`);
    console.log(`Flows Without Critical Failures: ${passedFlows}`);
    console.log(`Total Steps Tested: ${totalSteps}`);
    console.log(`Steps Passed: ${passedSteps}`);
    console.log(`Steps Failed: ${totalSteps - passedSteps}`);
    console.log(`Overall Success Rate: ${((passedSteps / totalSteps) * 100).toFixed(1)}%`);
    console.log(`Critical Failures: ${this.criticalFailures.length}`);
    
    console.log(`\n🔍 FLOW BREAKDOWN:`);
    this.flowResults.forEach(flow => {
      const status = flow.critical ? '🚨 CRITICAL' : flow.failed === 0 ? '✅ PASS' : '⚠️  PARTIAL';
      const rate = ((flow.passed / flow.steps.length) * 100).toFixed(1);
      console.log(`${status} ${flow.flow}: ${flow.passed}/${flow.steps.length} (${rate}%)`);
      
      if (flow.errors.length > 0) {
        flow.errors.slice(0, 2).forEach(error => {
          console.log(`   ❌ ${error}`);
        });
        if (flow.errors.length > 2) {
          console.log(`   ... and ${flow.errors.length - 2} more errors`);
        }
      }
    });
    
    if (this.criticalFailures.length > 0) {
      console.log(`\n🚨 CRITICAL FAILURES (${this.criticalFailures.length}):`);
      this.criticalFailures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.flow} - ${failure.step}: ${failure.error}`);
      });
    }
    
    const isProductionReady = this.criticalFailures.length === 0 && passedSteps >= (totalSteps * 0.9);
    console.log(`\n🏆 SYSTEM STATUS: ${isProductionReady ? '✅ PRODUCTION READY' : '❌ NEEDS CRITICAL FIXES'}`);
    
    if (isProductionReady) {
      console.log('🎉 All critical flows are working correctly!');
      console.log('🛡️ Multi-tenant isolation is properly enforced!');
      console.log('📊 Analytics and reporting are functional!');
      console.log('🔗 Relationship linking is operational!');
    } else {
      console.log('⚠️ Critical issues must be resolved before production deployment');
    }
  }
}

// Run the system-wide hard retest
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new SystemWideHardRetest();
  test.runSystemWideRetest().then(isProductionReady => {
    console.log(`\n🎯 FINAL RESULT: ${isProductionReady ? '✅ SYSTEM PRODUCTION HARDENED' : '❌ SYSTEM NEEDS CRITICAL FIXES'}`);
    process.exit(isProductionReady ? 0 : 1);
  }).catch(console.error);
}

export default SystemWideHardRetest;
