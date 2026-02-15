import fetch from 'node-fetch';

class StudentEnrollmentFix {
  constructor() {
    this.backendUrl = "http://localhost:3006";
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

  async fixOrphanedStudents() {
    console.log('🔧 Fixing orphaned students...');
    
    const token = await this.login('admin.greenwood@campus-sim.edu', 'admin123456');
    
    // Get all data needed
    const [usersResponse, classesResponse, sectionsResponse, yearsResponse, termsResponse] = await Promise.all([
      fetch(`${this.backendUrl}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${this.backendUrl}/api/sms/classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${this.backendUrl}/api/sms/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${this.backendUrl}/api/sms/academic-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${this.backendUrl}/api/sms/terms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    const users = await usersResponse.json().catch(() => []);
    const classes = await classesResponse.json().catch(() => []);
    const sections = await sectionsResponse.json().catch(() => []);
    const years = await yearsResponse.json().catch(() => []);
    const terms = await termsResponse.json().catch(() => []);
    
    const students = users.filter(u => u.role === 'student');
    const academicYear = years[0];
    const term = terms[0];
    
    console.log(`Found ${students.length} students, ${classes.length} classes, ${sections.length} sections`);
    
    let fixedCount = 0;
    
    for (const student of students) {
      // Find matching class and section
      const studentClass = classes.find(c => c.name === student.grade);
      if (!studentClass) continue;
      
      const classSections = sections.filter(s => s.classId === studentClass.id);
      const studentSection = classSections.find(s => s.name === student.classSection) || classSections[0];
      
      if (!studentSection) continue;
      
      // Create enrollment
      try {
        const enrollmentResponse = await fetch(`${this.backendUrl}/api/sms/students/enroll`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            academicYearId: academicYear.id,
            classId: studentClass.id,
            sectionId: studentSection.id,
            studentIds: [student.id]
          })
        });
        
        if (enrollmentResponse.ok) {
          fixedCount++;
          console.log(`✅ Enrolled ${student.name} in ${studentClass.name} - ${studentSection.name}`);
        }
      } catch (error) {
        console.log(`❌ Failed to enroll ${student.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} orphaned students`);
  }
}

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new StudentEnrollmentFix();
  fixer.fixOrphanedStudents().catch(console.error);
}

export default StudentEnrollmentFix;
