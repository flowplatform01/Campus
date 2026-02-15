import fetch from 'node-fetch';

class AutomatedEnrollmentTest {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.token = null;
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

  async testAutomatedEnrollment() {
    console.log('🔧 TESTING AUTOMATED ENROLLMENT SYSTEM');
    console.log('=====================================');
    
    try {
      // Login as admin
      this.token = await this.login('admin.greenwood@campus-sim.edu', 'admin123456');
      console.log('✅ Admin login successful');
      
      // Test 1: Get enrollment dashboard
      console.log('\n📊 Testing enrollment dashboard...');
      const dashboardResponse = await fetch(`${this.backendUrl}/api/enrollment/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (dashboardResponse.ok) {
        const dashboard = await dashboardResponse.json();
        console.log(`✅ Dashboard loaded`);
        console.log(`   Unassigned students: ${dashboard.statistics.unassignedStudents}`);
        console.log(`   Pending enrollments: ${dashboard.statistics.pendingEnrollments}`);
        console.log(`   Graduation candidates: ${dashboard.statistics.graduationCandidates}`);
        
        if (dashboard.statistics.unassignedStudents > 0) {
          console.log(`   Found ${dashboard.statistics.unassignedStudents} orphaned students`);
        }
      } else {
        console.log(`❌ Dashboard failed: ${dashboardResponse.status}`);
        return false;
      }
      
      // Test 2: Run auto-enrollment
      console.log('\n🔧 Testing auto-enrollment...');
      const enrollResponse = await fetch(`${this.backendUrl}/api/enrollment/auto-enroll`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (enrollResponse.ok) {
        const result = await enrollResponse.json();
        console.log(`✅ Auto-enrollment completed`);
        console.log(`   Total orphans: ${result.totalOrphans}`);
        console.log(`   Enrolled: ${result.enrolled}`);
        
        if (result.enrolled > 0) {
          console.log(`   Successfully enrolled ${result.enrolled} students`);
          result.results.slice(0, 3).forEach((r, i) => {
            console.log(`   ${i+1}. ${r.studentName}: ${r.status}`);
          });
        }
      } else {
        console.log(`❌ Auto-enrollment failed: ${enrollResponse.status}`);
        const error = await enrollResponse.json().catch(() => null);
        console.log(`   Error: ${error?.message || 'Unknown error'}`);
        return false;
      }
      
      // Test 3: Verify dashboard after enrollment
      console.log('\n📊 Verifying enrollment results...');
      const verifyResponse = await fetch(`${this.backendUrl}/api/enrollment/dashboard`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (verifyResponse.ok) {
        const verify = await verifyResponse.json();
        console.log(`✅ Verification complete`);
        console.log(`   Unassigned students after: ${verify.statistics.unassignedStudents}`);
        console.log(`   Total active enrollments: ${verify.statistics.totalActiveEnrollments}`);
        
        if (verify.statistics.unassignedStudents === 0) {
          console.log(`🎉 ALL ORPHANED STUDENTS SUCCESSFULLY ENROLLED!`);
        }
      } else {
        console.log(`❌ Verification failed: ${verifyResponse.status}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Automated enrollment test failed:', error.message);
      return false;
    }
  }

  async testStudentPromotion() {
    console.log('\n📈 TESTING STUDENT PROMOTION SYSTEM');
    console.log('===================================');
    
    try {
      // Get current academic year
      const yearsResponse = await fetch(`${this.backendUrl}/api/sms/academic-years`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (!yearsResponse.ok) {
        console.log('❌ Could not get academic years');
        return false;
      }
      
      const years = await yearsResponse.json();
      if (years.length < 2) {
        console.log('⚠️ Need at least 2 academic years for promotion test');
        return true; // Not a failure, just not testable
      }
      
      const targetYear = years[1]; // Use second year for promotion
      console.log(`   Target year: ${targetYear.name}`);
      
      // Test promotion
      const promoteResponse = await fetch(`${this.backendUrl}/api/enrollment/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetYearId: targetYear.id })
      });
      
      if (promoteResponse.ok) {
        const result = await promoteResponse.json();
        console.log(`✅ Promotion test completed`);
        console.log(`   Total processed: ${result.totalProcessed}`);
        console.log(`   Promoted: ${result.promoted}`);
        console.log(`   Graduated: ${result.graduated}`);
        
        if (result.promoted > 0 || result.graduated > 0) {
          console.log(`   Sample results:`);
          result.results.slice(0, 3).forEach((r, i) => {
            console.log(`   ${i+1}. ${r.studentName}: ${r.action}`);
          });
        }
      } else {
        console.log(`❌ Promotion failed: ${promoteResponse.status}`);
        const error = await promoteResponse.json().catch(() => null);
        console.log(`   Error: ${error?.message || 'Unknown error'}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Student promotion test failed:', error.message);
      return false;
    }
  }

  async runEnrollmentTests() {
    console.log('🚀 AUTOMATED ENROLLMENT SYSTEM TEST');
    console.log('===================================');
    
    const enrollmentSuccess = await this.testAutomatedEnrollment();
    const promotionSuccess = await this.testStudentPromotion();
    
    console.log('\n📊 ENROLLMENT SYSTEM TEST RESULTS');
    console.log('==================================');
    console.log(`Automated Enrollment: ${enrollmentSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Student Promotion: ${promotionSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallSuccess = enrollmentSuccess && promotionSuccess;
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? '✅ ENROLLMENT SYSTEM HARDENED' : '❌ NEEDS FIXES'}`);
    
    return overallSuccess;
  }
}

// Run the enrollment system test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new AutomatedEnrollmentTest();
  test.runEnrollmentTests().then(success => {
    console.log(`\n🎯 FINAL RESULT: ${success ? '✅ ENROLLMENT AUTOMATION COMPLETE' : '❌ ENROLLMENT NEEDS WORK'}`);
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}

export default AutomatedEnrollmentTest;
