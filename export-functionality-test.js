import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

class ExportFunctionalityTest {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map();
    this.testResults = [];
    this.downloadedFiles = [];
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

  async testExport(featureName, exportUrl, expectedContentType) {
    console.log(`📄 Testing ${featureName} export...`);
    
    const token = this.tokens.get('admin');
    if (!token) throw new Error('No admin token');
    
    try {
      const response = await fetch(`${this.backendUrl}/api/export${exportUrl}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      const contentDisposition = response.headers.get('content-disposition');
      
      if (!contentType || !contentType.includes(expectedContentType)) {
        throw new Error(`Expected ${expectedContentType}, got ${contentType}`);
      }
      
      const buffer = await response.arrayBuffer();
      const filename = contentDisposition ? 
        contentDisposition.match(/filename="([^"]+)"/)?.[1] : 
        `${featureName.toLowerCase()}-export`;
      
      // Save file for verification
      const filePath = path.join(process.cwd(), 'temp-exports', filename);
      if (!fs.existsSync(path.join(process.cwd(), 'temp-exports'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp-exports'));
      }
      
      fs.writeFileSync(filePath, Buffer.from(buffer));
      this.downloadedFiles.push({ feature: featureName, path: filePath, size: buffer.byteLength });
      
      console.log(`✅ ${featureName}: SUCCESS - ${filename} (${buffer.byteLength} bytes)`);
      return { success: true, filename, size: buffer.byteLength };
      
    } catch (error) {
      console.log(`❌ ${featureName}: FAILED - ${error.message}`);
      this.testResults.push({ feature: featureName, success: false, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async testStudentReportExport() {
    // First get a student ID
    const token = this.tokens.get('admin');
    const usersResponse = await fetch(`${this.backendUrl}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const users = await usersResponse.json();
    const student = Array.isArray(users) ? users.find(u => u.role === 'student') : null;
    
    if (!student) {
      throw new Error('No student found for testing');
    }
    
    // Test PDF export
    await this.testExport('Student PDF Report', `/student/${student.id}/pdf?academicYearId=test&termId=test`, 'application/pdf');
    
    // Test Excel export
    await this.testExport('Student Excel Report', `/student/${student.id}/excel?academicYearId=test&termId=test`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  async testClassReportExport() {
    // Get a class ID
    const token = this.tokens.get('admin');
    const classesResponse = await fetch(`${this.backendUrl}/api/sms/classes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const classes = await classesResponse.json();
    if (!classes.length) {
      throw new Error('No classes found for testing');
    }
    
    const classId = classes[0].id;
    
    // Test PDF export
    await this.testExport('Class PDF Report', `/class/${classId}/pdf?academicYearId=test&termId=test`, 'application/pdf');
    
    // Test Excel export
    await this.testExport('Class Excel Report', `/class/${classId}/excel?academicYearId=test&termId=test`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  async testAttendanceExport() {
    // Get class ID for attendance
    const token = this.tokens.get('admin');
    const classesResponse = await fetch(`${this.backendUrl}/api/sms/classes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const classes = await classesResponse.json();
    if (!classes.length) {
      throw new Error('No classes found for attendance testing');
    }
    
    const classId = classes[0].id;
    
    // Test PDF export
    await this.testExport('Attendance PDF Report', `/attendance/pdf?classId=${classId}&academicYearId=test&termId=test`, 'application/pdf');
    
    // Test Excel export
    await this.testExport('Attendance Excel Report', `/attendance/excel?classId=${classId}&academicYearId=test&termId=test`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  async testAssignmentsExport() {
    // Get class ID for assignments
    const token = this.tokens.get('admin');
    const classesResponse = await fetch(`${this.backendUrl}/api/sms/classes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const classes = await classesResponse.json();
    if (!classes.length) {
      throw new Error('No classes found for assignments testing');
    }
    
    const classId = classes[0].id;
    
    // Test CSV export
    await this.testExport('Assignments CSV Export', `/assignments/csv?classId=${classId}&academicYearId=test&termId=test`, 'text/csv');
  }

  async testFileIntegrity() {
    console.log('🔍 Testing file integrity...');
    
    let integrityIssues = 0;
    
    for (const file of this.downloadedFiles) {
      try {
        const stats = fs.statSync(file.path);
        
        if (stats.size === 0) {
          console.log(`❌ ${file.feature}: Empty file`);
          integrityIssues++;
        } else if (stats.size !== file.size) {
          console.log(`❌ ${file.feature}: Size mismatch - expected ${file.size}, got ${stats.size}`);
          integrityIssues++;
        } else {
          console.log(`✅ ${file.feature}: File integrity verified`);
        }
      } catch (error) {
        console.log(`❌ ${file.feature}: Cannot verify file - ${error.message}`);
        integrityIssues++;
      }
    }
    
    return integrityIssues === 0;
  }

  async testRoleBasedExportAccess() {
    console.log('🔐 Testing role-based export access...');
    
    const testCases = [
      { role: 'student', shouldFail: true, description: 'Student should not access admin exports' },
      { role: 'teacher', shouldFail: false, description: 'Teacher should access class exports' },
      { role: 'parent', shouldFail: true, description: 'Parent should not access admin exports' }
    ];
    
    let accessTestsPassed = 0;
    
    for (const testCase of testCases) {
      const token = this.tokens.get(testCase.role);
      if (!token) {
        console.log(`⚠️ Skipping ${testCase.role} - no token`);
        continue;
      }
      
      try {
        const response = await fetch(`${this.backendUrl}/api/export/assignments/csv`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const accessDenied = response.status === 403;
        const expectedAccessDenied = testCase.shouldFail;
        
        if (accessDenied === expectedAccessDenied) {
          console.log(`✅ ${testCase.description}: CORRECT`);
          accessTestsPassed++;
        } else {
          console.log(`❌ ${testCase.description}: INCORRECT - got ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${testCase.description}: ERROR - ${error.message}`);
      }
    }
    
    return accessTestsPassed === testCases.length;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test files...');
    
    try {
      const tempDir = path.join(process.cwd(), 'temp-exports');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
        console.log('✅ Cleanup complete');
      }
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }

  async setupTestUsers() {
    console.log('🔧 Setting up test users...');
    
    try {
      const adminToken = await this.login('admin.greenwood@campus-sim.edu', 'admin123456');
      this.tokens.set('admin', adminToken);
      
      const teacherToken = await this.login('teacher1.greenwood-academy@campus-sim.edu', 'staff123456');
      this.tokens.set('teacher', teacherToken);
      
      const studentToken = await this.login('alice.johnson0.greenwood-academy@campus-sim.edu', 'student123456');
      this.tokens.set('student', studentToken);
      
      const parentToken = await this.login('parent.alice0.greenwood-academy@campus-sim.edu', 'parent123456');
      this.tokens.set('parent', parentToken);
      
      console.log('✅ Test users setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test users:', error.message);
      throw error;
    }
  }

  async runPhase5() {
    console.log('🚀 PHASE 5: DATA EXPORT & FILE FLOW');
    console.log('======================================');
    
    try {
      // Setup test users
      await this.setupTestUsers();
      
      // Test all export functionality
      await this.testStudentReportExport();
      await this.testClassReportExport();
      await this.testAttendanceExport();
      await this.testAssignmentsExport();
      
      // Test file integrity
      const integrityPassed = await this.testFileIntegrity();
      
      // Test role-based access
      const accessPassed = await this.testRoleBasedExportAccess();
      
      // Generate report
      this.generateExportReport(integrityPassed, accessPassed);
      
    } finally {
      // Cleanup
      await this.cleanup();
    }
    
    console.log('🎯 PHASE 5 COMPLETE: Data export & file flow test finished');
  }

  generateExportReport(integrityPassed, accessPassed) {
    console.log('\n📊 EXPORT FUNCTIONALITY REPORT');
    console.log('=================================');
    
    const totalExports = this.downloadedFiles.length;
    const successfulExports = this.downloadedFiles.filter(f => f.size > 0).length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Export Types: ${totalExports}`);
    console.log(`Successful Exports: ${successfulExports}`);
    console.log(`File Integrity: ${integrityPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Access Control: ${accessPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log(`\n🔍 DETAILED RESULTS:`);
    this.downloadedFiles.forEach(file => {
      const status = file.size > 0 ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`${status} ${file.feature}: ${file.size} bytes`);
    });
    
    const overallSuccess = integrityPassed && accessPassed && successfulExports === totalExports;
    console.log(`\n🏆 OVERALL STATUS: ${overallSuccess ? '✅ PRODUCTION READY' : '❌ NEEDS FIXES'}`);
  }
}

// Run Phase 5
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new ExportFunctionalityTest();
  test.runPhase5().catch(console.error);
}

export default ExportFunctionalityTest;
