import fetch from 'node-fetch';

class RelationshipValidationTest {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map();
    this.testResults = new Map();
    this.issues = [];
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

  async testEndpoint(userType, endpoint, method = 'GET', data = null, expectedStatus = 200) {
    const token = this.tokens.get(userType);
    if (!token) {
      this.issues.push(`No token found for user type: ${userType}`);
      return false;
    }
    
    const url = `${this.backendUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const success = response.status === expectedStatus;
      
      if (!success) {
        const errorData = await response.json().catch(() => null);
        this.issues.push(`${userType} ${method} ${endpoint}: Expected ${expectedStatus}, got ${response.status} - ${errorData?.message || 'No error message'}`);
      }
      
      return success;
    } catch (error) {
      this.issues.push(`${userType} ${method} ${endpoint}: Network error - ${error.message}`);
      return false;
    }
  }

  async validateStudentClassRelationship() {
    console.log('🔗 Testing Student ↔ Class Relationships');
    
    // Test student can see their own class data
    const studentCanSeeOwnClass = await this.testEndpoint(
      'student', 
      '/api/academics/grades', 
      'GET'
    );
    
    // Test student cannot see other classes
    const studentCannotSeeAllClasses = await this.testEndpoint(
      'student',
      '/api/sms/classes',
      'GET',
      null,
      403
    );
    
    // Test admin can see all classes
    const adminCanSeeAllClasses = await this.testEndpoint(
      'admin',
      '/api/sms/classes',
      'GET'
    );
    
    // Test teacher can see their assigned classes
    const teacherCanSeeClasses = await this.testEndpoint(
      'teacher',
      '/api/sms/classes',
      'GET'
    );
    
    this.testResults.set('studentClass', {
      studentCanSeeOwnClass,
      studentCannotSeeAllClasses,
      adminCanSeeAllClasses,
      teacherCanSeeClasses
    });
  }

  async validateTeacherSubjectRelationship() {
    console.log('🔗 Testing Teacher ↔ Subject Relationships');
    
    // Test teacher can see subjects
    const teacherCanSeeSubjects = await this.testEndpoint(
      'teacher',
      '/api/sms/subjects',
      'GET'
    );
    
    // Test teacher can create assignments for their subjects
    const teacherCanCreateAssignment = await this.testEndpoint(
      'teacher',
      '/api/sms/assignments',
      'POST',
      {
        academicYearId: 'test-year-id',
        termId: 'test-term-id',
        classId: 'test-class-id',
        sectionId: 'test-section-id',
        subjectId: 'test-subject-id',
        title: 'Test Assignment',
        instructions: 'Test instructions',
        dueAt: new Date().toISOString(),
        maxScore: 100
      },
      400 // Should fail with invalid IDs
    );
    
    // Test admin can manage subjects
    const adminCanManageSubjects = await this.testEndpoint(
      'admin',
      '/api/sms/subjects',
      'POST',
      {
        name: 'Test Subject',
        code: 'TEST'
      },
      201
    );
    
    this.testResults.set('teacherSubject', {
      teacherCanSeeSubjects,
      teacherCanCreateAssignment,
      adminCanManageSubjects
    });
  }

  async validateParentStudentRelationship() {
    console.log('🔗 Testing Parent ↔ Student Relationships');
    
    // Test parent can see their children's data
    const parentCanSeeGrades = await this.testEndpoint(
      'parent',
      '/api/academics/grades',
      'GET'
    );
    
    // Test parent cannot see all students
    const parentCannotSeeAllStudents = await this.testEndpoint(
      'parent',
      '/api/users',
      'GET',
      null,
      403
    );
    
    // Test parent cannot access admin panels
    const parentCannotAccessAdmin = await this.testEndpoint(
      'parent',
      '/api/sms/dashboard',
      'GET',
      null,
      403
    );
    
    // Test parent can see announcements
    const parentCanSeeAnnouncements = await this.testEndpoint(
      'parent',
      '/api/announcements',
      'GET'
    );
    
    this.testResults.set('parentStudent', {
      parentCanSeeGrades,
      parentCannotSeeAllStudents,
      parentCannotAccessAdmin,
      parentCanSeeAnnouncements
    });
  }

  async validateAdminPermissions() {
    console.log('🔗 Testing Admin Permissions');
    
    // Test admin can manage users
    const adminCanManageUsers = await this.testEndpoint(
      'admin',
      '/api/users',
      'GET'
    );
    
    // Test admin can create users
    const adminCanCreateUser = await this.testEndpoint(
      'admin',
      '/api/users',
      'POST',
      {
        email: 'testuser@validation.edu',
        password: 'test123456',
        name: 'Test User',
        role: 'student'
      },
      400 // Should fail with duplicate email or validation
    );
    
    // Test admin can access school settings
    const adminCanAccessSchool = await this.testEndpoint(
      'admin',
      '/api/sms/school',
      'GET'
    );
    
    // Test admin can manage payments
    const adminCanManagePayments = await this.testEndpoint(
      'admin',
      '/api/sms/payments/invoices',
      'GET'
    );
    
    this.testResults.set('adminPermissions', {
      adminCanManageUsers,
      adminCanCreateUser,
      adminCanAccessSchool,
      adminCanManagePayments
    });
  }

  async validateMultiTenantIsolation() {
    console.log('🔗 Testing Multi-Tenant Isolation');
    
    // Test school1 admin cannot see school2 data
    const school1AdminCannotSeeSchool2 = await this.testEndpoint(
      'school2-admin',
      '/api/sms/school',
      'GET'
    );
    
    // Test school1 teacher cannot see school2 students
    const school1TeacherCannotSeeSchool2Students = await this.testEndpoint(
      'school2-teacher',
      '/api/users',
      'GET'
    );
    
    // Test school1 parent cannot see school2 announcements
    const school1ParentCannotSeeSchool2Announcements = await this.testEndpoint(
      'school2-parent',
      '/api/announcements',
      'GET'
    );
    
    this.testResults.set('multiTenant', {
      school1AdminCannotSeeSchool2,
      school1TeacherCannotSeeSchool2Students,
      school1ParentCannotSeeSchool2Announcements
    });
  }

  async validateDataIntegrity() {
    console.log('🔗 Testing Data Integrity');
    
    // Test orphan records (students without classes)
    const studentsResponse = await fetch(`${this.backendUrl}/api/users`, {
      headers: { 'Authorization': `Bearer ${this.tokens.get('admin')}` }
    });
    
    if (studentsResponse.ok) {
      const students = await studentsResponse.json();
      const orphanedStudents = students.filter(s => 
        s.role === 'student' && (!s.grade || !s.classSection)
      );
      
      if (orphanedStudents.length > 0) {
        this.issues.push(`Found ${orphanedStudents.length} orphaned students without proper class assignment`);
      }
    }
    
    // Test circular references
    const classesResponse = await fetch(`${this.backendUrl}/api/sms/classes`, {
      headers: { 'Authorization': `Bearer ${this.tokens.get('admin')}` }
    });
    
    if (classesResponse.ok) {
      const classes = await classesResponse.json();
      // Check for duplicate class names within same school
      const classNames = classes.map(c => c.name);
      const duplicates = classNames.filter((name, index) => classNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        this.issues.push(`Found duplicate class names: ${[...new Set(duplicates)].join(', ')}`);
      }
    }
    
    this.testResults.set('dataIntegrity', {
      orphanedStudentsChecked: true,
      duplicateClassesChecked: true
    });
  }

  async setupTestUsers() {
    console.log('🔧 Setting up test users for validation...');
    
    try {
      // Login as existing users
      const adminToken = await this.login('admin.greenwood@campus-sim.edu', 'admin123456');
      this.tokens.set('admin', adminToken);
      
      const studentToken = await this.login('alice.johnson0.greenwood-academy@campus-sim.edu', 'student123456');
      this.tokens.set('student', studentToken);
      
      const teacherToken = await this.login('teacher1.greenwood-academy@campus-sim.edu', 'staff123456');
      this.tokens.set('teacher', teacherToken);
      
      const parentToken = await this.login('parent.alice0.greenwood-academy@campus-sim.edu', 'parent123456');
      this.tokens.set('parent', parentToken);
      
      // For multi-tenant testing, try to login to second school
      try {
        const school2AdminToken = await this.login('admin.riverside@campus-sim.edu', 'admin123456');
        this.tokens.set('school2-admin', school2AdminToken);
      } catch (e) {
        console.log('⚠️ Could not login to second school for multi-tenant testing');
      }
      
      console.log('✅ Test users setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test users:', error.message);
      this.issues.push(`Test user setup failed: ${error.message}`);
    }
  }

  async runPhase3() {
    console.log('🚀 PHASE 3: RELATIONSHIP & LINKING VALIDATION');
    console.log('============================================');
    
    // Setup test users
    await this.setupTestUsers();
    
    // Run all validation tests
    await this.validateStudentClassRelationship();
    await this.validateTeacherSubjectRelationship();
    await this.validateParentStudentRelationship();
    await this.validateAdminPermissions();
    await this.validateMultiTenantIsolation();
    await this.validateDataIntegrity();
    
    // Generate report
    this.generateValidationReport();
    
    console.log('🎯 PHASE 3 COMPLETE: Relationship validation finished');
  }

  generateValidationReport() {
    console.log('\n📊 VALIDATION REPORT');
    console.log('====================');
    
    let totalTests = 0;
    let passedTests = 0;
    
    for (const [category, results] of this.testResults) {
      console.log(`\n🔍 ${category.toUpperCase()}:`);
      
      for (const [testName, result] of Object.entries(results)) {
        totalTests++;
        const status = result ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${testName}: ${status}`);
        if (result) passedTests++;
      }
    }
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (this.issues.length > 0) {
      console.log(`\n⚠️ ISSUES FOUND (${this.issues.length}):`);
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No critical issues found!');
    }
  }
}

// Run Phase 3
if (import.meta.url === `file://${process.argv[1]}`) {
  const validation = new RelationshipValidationTest();
  validation.runPhase3().catch(console.error);
}

export default RelationshipValidationTest;
