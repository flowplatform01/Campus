import fetch from 'node-fetch';

class FeatureUtilizationTest {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map();
    this.testResults = [];
    this.createdData = new Map();
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

  async testFeature(featureName, testFunction) {
    console.log(`🧪 Testing ${featureName}...`);
    try {
      const result = await testFunction();
      this.testResults.push({ feature: featureName, success: true, result });
      console.log(`✅ ${featureName}: SUCCESS`);
      return result;
    } catch (error) {
      this.testResults.push({ feature: featureName, success: false, error: error.message });
      console.log(`❌ ${featureName}: FAILED - ${error.message}`);
      return null;
    }
  }

  async testAssignments() {
    const token = this.tokens.get('teacher');
    if (!token) throw new Error('No teacher token');
    
    // Get existing data
    const [classesResponse, subjectsResponse, termsResponse, yearsResponse] = await Promise.all([
      fetch(`${this.backendUrl}/api/sms/classes`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${this.backendUrl}/api/sms/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${this.backendUrl}/api/sms/terms`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${this.backendUrl}/api/sms/academic-years`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    
    const classes = await classesResponse.json();
    const subjects = await subjectsResponse.json();
    const terms = await termsResponse.json();
    const years = await yearsResponse.json();
    
    if (!classes.length || !subjects.length || !terms.length || !years.length) {
      throw new Error('Missing required data');
    }
    
    // Create assignment
    const assignmentData = {
      academicYearId: years[0].id,
      termId: terms[0].id,
      classId: classes[0].id,
      sectionId: 'test-section', // This might fail, but that's ok for testing
      subjectId: subjects[0].id,
      title: 'Feature Test Assignment',
      instructions: 'This is a test assignment for feature utilization',
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 100
    };
    
    const createResponse = await fetch(`${this.backendUrl}/api/sms/assignments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assignmentData)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Assignment creation failed: ${createResponse.status}`);
    }
    
    const assignment = await createResponse.json();
    this.createdData.set('assignment', assignment);
    
    // Test publishing assignment
    const publishResponse = await fetch(`${this.backendUrl}/api/sms/assignments/${assignment.id}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!publishResponse.ok) {
      throw new Error(`Assignment publish failed: ${publishResponse.status}`);
    }
    
    return { created: assignment, published: true };
  }

  async testAnnouncements() {
    const token = this.tokens.get('admin');
    if (!token) throw new Error('No admin token');
    
    // Create announcement
    const announcementData = {
      title: 'System Test Announcement',
      message: 'This is a test announcement for feature utilization testing. Please ignore.',
      category: 'general'
    };
    
    const createResponse = await fetch(`${this.backendUrl}/api/announcements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(announcementData)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Announcement creation failed: ${createResponse.status}`);
    }
    
    const announcement = await createResponse.json();
    this.createdData.set('announcement', announcement);
    
    // Test retrieving announcements
    const listResponse = await fetch(`${this.backendUrl}/api/announcements`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!listResponse.ok) {
      throw new Error(`Announcement list failed: ${listResponse.status}`);
    }
    
    const announcements = await listResponse.json();
    return { created: announcement, listed: announcements.length };
  }

  async testNotifications() {
    const token = this.tokens.get('admin');
    if (!token) throw new Error('No admin token');
    
    // Test notification system
    const listResponse = await fetch(`${this.backendUrl}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!listResponse.ok) {
      throw new Error(`Notification list failed: ${listResponse.status}`);
    }
    
    const notifications = await listResponse.json();
    return { count: notifications.length };
  }

  async testPayments() {
    const token = this.tokens.get('admin');
    if (!token) throw new Error('No admin token');
    
    // Test fee heads
    const feeHeadData = {
      name: 'Test Fee Head',
      code: 'TEST'
    };
    
    const feeHeadResponse = await fetch(`${this.backendUrl}/api/sms/payments/fee-heads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feeHeadData)
    });
    
    if (!feeHeadResponse.ok) {
      throw new Error(`Fee head creation failed: ${feeHeadResponse.status}`);
    }
    
    const feeHead = await feeHeadResponse.json();
    
    // Test payment settings
    const settingsResponse = await fetch(`${this.backendUrl}/api/sms/payments/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!settingsResponse.ok) {
      throw new Error(`Payment settings failed: ${settingsResponse.status}`);
    }
    
    const settings = await settingsResponse.json();
    
    // Test invoices
    const invoicesResponse = await fetch(`${this.backendUrl}/api/sms/payments/invoices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!invoicesResponse.ok) {
      throw new Error(`Invoices list failed: ${invoicesResponse.status}`);
    }
    
    const invoices = await invoicesResponse.json();
    
    return { feeHead, settings, invoiceCount: invoices.length };
  }

  async testAttendance() {
    const token = this.tokens.get('teacher');
    if (!token) throw new Error('No teacher token');
    
    // Get existing data
    const [classesResponse, termsResponse, yearsResponse] = await Promise.all([
      fetch(`${this.backendUrl}/api/sms/classes`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${this.backendUrl}/api/sms/terms`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${this.backendUrl}/api/sms/academic-years`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    
    const classes = await classesResponse.json();
    const terms = await termsResponse.json();
    const years = await yearsResponse.json();
    
    if (!classes.length || !terms.length || !years.length) {
      throw new Error('Missing required data for attendance');
    }
    
    // Create attendance session
    const sessionData = {
      academicYearId: years[0].id,
      termId: terms[0].id,
      classId: classes[0].id,
      date: new Date().toISOString().split('T')[0]
    };
    
    const sessionResponse = await fetch(`${this.backendUrl}/api/sms/attendance/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Attendance session creation failed: ${sessionResponse.status}`);
    }
    
    const session = await sessionResponse.json();
    this.createdData.set('attendanceSession', session);
    
    return { session };
  }

  async testSocialFeatures() {
    const token = this.tokens.get('student');
    if (!token) throw new Error('No student token');
    
    // Create a post
    const postData = {
      content: 'This is a test post for feature utilization testing.',
      category: 'general',
      visibility: 'public'
    };
    
    const postResponse = await fetch(`${this.backendUrl}/api/social/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    if (!postResponse.ok) {
      throw new Error(`Post creation failed: ${postResponse.status}`);
    }
    
    const post = await postResponse.json();
    this.createdData.set('post', post);
    
    // Test getting feed
    const feedResponse = await fetch(`${this.backendUrl}/api/social/posts/feed`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!feedResponse.ok) {
      throw new Error(`Feed retrieval failed: ${feedResponse.status}`);
    }
    
    const feed = await feedResponse.json();
    
    // Test liking post
    const likeResponse = await fetch(`${this.backendUrl}/api/social/posts/${post.id}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const liked = likeResponse.ok;
    
    return { post, feedPosts: feed.posts?.length || 0, liked };
  }

  async testAcademicRecords() {
    const studentToken = this.tokens.get('student');
    const teacherToken = this.tokens.get('teacher');
    
    if (!studentToken || !teacherToken) {
      throw new Error('Missing student or teacher token');
    }
    
    // Test student grades
    const gradesResponse = await fetch(`${this.backendUrl}/api/academics/grades`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    
    if (!gradesResponse.ok) {
      throw new Error(`Grades retrieval failed: ${gradesResponse.status}`);
    }
    
    const grades = await gradesResponse.json();
    
    // Test student attendance
    const attendanceResponse = await fetch(`${this.backendUrl}/api/academics/attendance`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    
    if (!attendanceResponse.ok) {
      throw new Error(`Attendance retrieval failed: ${attendanceResponse.status}`);
    }
    
    const attendance = await attendanceResponse.json();
    
    // Test assignments
    const assignmentsResponse = await fetch(`${this.backendUrl}/api/academics/assignments`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    
    if (!assignmentsResponse.ok) {
      throw new Error(`Assignments retrieval failed: ${assignmentsResponse.status}`);
    }
    
    const assignments = await assignmentsResponse.json();
    
    return { 
      grades: grades.length || 0, 
      attendance: attendance.length || 0, 
      assignments: assignments.length || 0 
    };
  }

  async testUserManagement() {
    const token = this.tokens.get('admin');
    if (!token) throw new Error('No admin token');
    
    // Test user listing
    const usersResponse = await fetch(`${this.backendUrl}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!usersResponse.ok) {
      throw new Error(`User listing failed: ${usersResponse.status}`);
    }
    
    const users = await usersResponse.json();
    
    // Test user creation (should fail with duplicate email)
    const userData = {
      email: `testuser${Date.now()}@test.edu`,
      password: 'test123456',
      name: 'Test User',
      role: 'student'
    };
    
    const createResponse = await fetch(`${this.backendUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const created = createResponse.ok;
    
    return { totalUsers: users.length, userCreated: created };
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
      
      console.log('✅ Test users setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test users:', error.message);
      throw error;
    }
  }

  async runPhase4() {
    console.log('🚀 PHASE 4: FEATURE UTILIZATION TEST');
    console.log('====================================');
    
    // Setup test users
    await this.setupTestUsers();
    
    // Test all features
    await this.testFeature('Assignments', () => this.testAssignments());
    await this.testFeature('Announcements', () => this.testAnnouncements());
    await this.testFeature('Notifications', () => this.testNotifications());
    await this.testFeature('Payments', () => this.testPayments());
    await this.testFeature('Attendance', () => this.testAttendance());
    await this.testFeature('Social Features', () => this.testSocialFeatures());
    await this.testFeature('Academic Records', () => this.testAcademicRecords());
    await this.testFeature('User Management', () => this.testUserManagement());
    
    // Generate report
    this.generateUtilizationReport();
    
    console.log('🎯 PHASE 4 COMPLETE: Feature utilization test finished');
  }

  generateUtilizationReport() {
    console.log('\n📊 FEATURE UTILIZATION REPORT');
    console.log('===============================');
    
    let totalFeatures = this.testResults.length;
    let workingFeatures = this.testResults.filter(r => r.success).length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Features Tested: ${totalFeatures}`);
    console.log(`Working Features: ${workingFeatures}`);
    console.log(`Failed Features: ${totalFeatures - workingFeatures}`);
    console.log(`Success Rate: ${((workingFeatures / totalFeatures) * 100).toFixed(1)}%`);
    
    console.log(`\n🔍 DETAILED RESULTS:`);
    this.testResults.forEach(result => {
      const status = result.success ? '✅ WORKING' : '❌ FAILED';
      console.log(`${status} ${result.feature}`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n📋 CREATED DATA:`);
    for (const [key, value] of this.createdData) {
      console.log(`${key}: ${JSON.stringify(value, null, 2).substring(0, 100)}...`);
    }
  }
}

// Run Phase 4
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new FeatureUtilizationTest();
  test.runPhase4().catch(console.error);
}

export default FeatureUtilizationTest;
