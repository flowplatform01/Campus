import fetch from 'node-fetch';

class AcademicYearDataSimulation {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map();
    this.schools = new Map();
    this.users = new Map();
    this.academicData = new Map();
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

  async getSchoolData(schoolId) {
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    // Get school info
    const schoolResponse = await fetch(`${this.backendUrl}/api/sms/school`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get academic years
    const yearsResponse = await fetch(`${this.backendUrl}/api/sms/academic-years`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get terms
    const termsResponse = await fetch(`${this.backendUrl}/api/sms/terms`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get classes
    const classesResponse = await fetch(`${this.backendUrl}/api/sms/classes`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get sections
    const sectionsResponse = await fetch(`${this.backendUrl}/api/sms/sections`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get subjects
    const subjectsResponse = await fetch(`${this.backendUrl}/api/sms/subjects`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get users
    const usersResponse = await fetch(`${this.backendUrl}/api/users`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const school = await schoolResponse.json().catch(() => null);
    const years = await yearsResponse.json().catch(() => null);
    const terms = await termsResponse.json().catch(() => null);
    const classes = await classesResponse.json().catch(() => null);
    const sections = await sectionsResponse.json().catch(() => null);
    const subjects = await subjectsResponse.json().catch(() => null);
    const users = await usersResponse.json().catch(() => null);
    
    return { school, years, terms, classes, sections, subjects, users };
  }

  async enrollStudents(schoolId) {
    console.log(`📝 Enrolling students for ${schoolId}`);
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    const data = await this.getSchoolData(schoolId);
    const { years, classes, sections, users } = data;
    
    if (!years || years.length === 0) return;
    
    const academicYear = years[0]; // Use first academic year
    const students = users.filter(u => u.role === 'student');
    const allSections = sections || [];
    
    for (const student of students) {
      // Find appropriate class and section based on student's grade
      const studentClass = classes.find(c => c.name === student.grade);
      if (!studentClass) continue;
      
      const classSections = allSections.filter(s => s.classId === studentClass.id);
      const studentSection = classSections.find(s => s.name === student.classSection) || classSections[0];
      
      if (!studentSection) continue;
      
      // Create enrollment
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
        console.log(`✅ Enrolled ${student.name} in ${studentClass.name} - ${studentSection.name}`);
      }
    }
  }

  async createTimetable(schoolId) {
    console.log(`📅 Creating timetable for ${schoolId}`);
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    const data = await this.getSchoolData(schoolId);
    const { years, terms, classes, sections, subjects, users } = data;
    
    if (!years || years.length === 0 || !terms || terms.length === 0) return;
    
    const academicYear = years[0];
    const term = terms[0]; // Use first term
    
    const teachers = users.filter(u => u.role === 'employee' && u.subRole === 'teacher');
    const allSections = sections || [];
    
    // Create timetable slots for each class section
    for (const classSection of allSections) {
      const classInfo = classes.find(c => c.id === classSection.classId);
      if (!classInfo) continue;
      
      // Create a weekly timetable
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const timeSlots = [
        { start: '08:00', end: '09:00' },
        { start: '09:00', end: '10:00' },
        { start: '10:30', end: '11:30' },
        { start: '11:30', end: '12:30' },
        { start: '14:00', end: '15:00' },
        { start: '15:00', end: '16:00' }
      ];
      
      for (const weekday of weekdays) {
        for (const timeSlot of timeSlots) {
          // Random subject and teacher
          const subject = subjects[Math.floor(Math.random() * subjects.length)];
          const teacher = teachers[Math.floor(Math.random() * teachers.length)];
          
          const slotResponse = await fetch(`${this.backendUrl}/api/sms/timetable/slots`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              academicYearId: academicYear.id,
              termId: term.id,
              classId: classInfo.id,
              sectionId: classSection.id,
              weekday,
              startTime: timeSlot.start,
              endTime: timeSlot.end,
              subjectId: subject.id,
              teacherId: teacher.id,
              room: `Room ${Math.floor(Math.random() * 20) + 1}`
            })
          });
          
          if (slotResponse.ok) {
            console.log(`✅ Created timetable slot: ${classInfo.name} - ${classSection.name} - ${weekday} ${timeSlot.start} - ${subject.name}`);
          }
        }
      }
    }
  }

  async createAssignments(schoolId) {
    console.log(`📚 Creating assignments for ${schoolId}`);
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    const data = await this.getSchoolData(schoolId);
    const { years, terms, classes, sections, subjects, users } = data;
    
    if (!years || years.length === 0 || !terms || terms.length === 0) return;
    
    const academicYear = years[0];
    const allTerms = terms;
    const teachers = users.filter(u => u.role === 'employee' && u.subRole === 'teacher');
    const allSections = sections || [];
    
    // Create assignments for each term
    for (const term of allTerms) {
      for (const classSection of allSections) {
        const classInfo = classes.find(c => c.id === classSection.classId);
        if (!classInfo) continue;
        
        // Create 3-5 assignments per term per class
        const assignmentCount = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < assignmentCount; i++) {
          const subject = subjects[Math.floor(Math.random() * subjects.length)];
          const teacher = teachers[Math.floor(Math.random() * teachers.length)];
          
          // Due date 2-4 weeks from now
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (Math.random() * 28) + 14);
          
          const assignmentResponse = await fetch(`${this.backendUrl}/api/sms/assignments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              academicYearId: academicYear.id,
              termId: term.id,
              classId: classInfo.id,
              sectionId: classSection.id,
              subjectId: subject.id,
              title: `${subject.name} Assignment ${i + 1}`,
              instructions: `Complete this ${subject.name.toLowerCase()} assignment. Submit your work before the due date.`,
              dueAt: dueDate.toISOString(),
              maxScore: 100
            })
          });
          
          if (assignmentResponse.ok) {
            const assignment = await assignmentResponse.json();
            console.log(`✅ Created assignment: ${assignment.title} for ${classInfo.name} - ${classSection.name}`);
            
            // Publish assignment
            await fetch(`${this.backendUrl}/api/sms/assignments/${assignment.id}/publish`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          }
        }
      }
    }
  }

  async recordAttendance(schoolId) {
    console.log(`📊 Recording attendance for ${schoolId}`);
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    const data = await this.getSchoolData(schoolId);
    const { years, terms, classes, sections, users } = data;
    
    if (!years || years.length === 0 || !terms || terms.length === 0) return;
    
    const academicYear = years[0];
    const term = terms[0];
    const students = users.filter(u => u.role === 'student');
    const allSections = sections || [];
    
    // Create attendance sessions for the past 30 days
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - dayOffset);
      
      // Skip weekends
      if (sessionDate.getDay() === 0 || sessionDate.getDay() === 6) continue;
      
      for (const classSection of allSections) {
        const classInfo = classes.find(c => c.id === classSection.classId);
        if (!classInfo) continue;
        
        // Create attendance session
        const sessionResponse = await fetch(`${this.backendUrl}/api/sms/attendance/sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            academicYearId: academicYear.id,
            termId: term.id,
            classId: classInfo.id,
            sectionId: classSection.id,
            date: sessionDate.toISOString().split('T')[0]
          })
        });
        
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          
          // Get students in this class section
          const sectionStudents = students.filter(s => 
            s.grade === classInfo.name && s.classSection === classSection.name
          );
          
          // Record attendance entries (90% present, 8% late, 2% absent)
          const entries = sectionStudents.map(student => {
            const rand = Math.random();
            let status = 'present';
            let note = '';
            
            if (rand < 0.02) {
              status = 'absent';
              note = 'Sick leave';
            } else if (rand < 0.10) {
              status = 'late';
              note = 'Traffic delay';
            }
            
            return {
              studentId: student.id,
              status,
              note: note || undefined
            };
          });
          
          // Save attendance entries
          await fetch(`${this.backendUrl}/api/sms/attendance/sessions/${session.id}/entries`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entries })
          });
          
          // Submit session
          await fetch(`${this.backendUrl}/api/sms/attendance/sessions/${session.id}/submit`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log(`✅ Recorded attendance for ${classInfo.name} - ${classSection.name} on ${sessionDate.toISOString().split('T')[0]}`);
        }
      }
    }
  }

  async createExams(schoolId) {
    console.log(`📝 Creating exams for ${schoolId}`);
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    const data = await this.getSchoolData(schoolId);
    const { years, terms, classes, sections, subjects, users } = data;
    
    if (!years || years.length === 0 || !terms || terms.length === 0) return;
    
    const academicYear = years[0];
    const allTerms = terms;
    const allSections = sections || [];
    
    // Create exams for each term
    for (const term of allTerms) {
      // Mid-term exam
      const midtermResponse = await fetch(`${this.backendUrl}/api/sms/exams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          academicYearId: academicYear.id,
          termId: term.id,
          name: `${term.name} Mid-term Exam`,
          type: 'midterm',
          startDate: term.startDate,
          endDate: term.endDate
        })
      });
      
      if (midtermResponse.ok) {
        const midterm = await midtermResponse.json();
        console.log(`✅ Created exam: ${midterm.name}`);
        
        // Create exam marks for each student
        await this.createExamMarks(schoolId, midterm.id, classes, sections, subjects, users);
      }
      
      // Final exam
      const finalResponse = await fetch(`${this.backendUrl}/api/sms/exams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          academicYearId: academicYear.id,
          termId: term.id,
          name: `${term.name} Final Exam`,
          type: 'final',
          startDate: term.startDate,
          endDate: term.endDate
        })
      });
      
      if (finalResponse.ok) {
        const final = await finalResponse.json();
        console.log(`✅ Created exam: ${final.name}`);
        
        // Create exam marks for each student
        await this.createExamMarks(schoolId, final.id, classes, sections, subjects, users);
      }
    }
  }

  async createExamMarks(schoolId, examId, classes, sections, subjects, users) {
    const token = this.tokens.get(schoolId);
    if (!token) return;
    
    const students = users.filter(u => u.role === 'student');
    const allSections = sections || [];
    
    for (const classSection of allSections) {
      const classInfo = classes.find(c => c.id === classSection.classId);
      if (!classInfo) continue;
      
      // Get students in this class section
      const sectionStudents = students.filter(s => 
        s.grade === classInfo.name && s.classSection === classSection.name
      );
      
      // Create marks for each student and subject
      const marks = [];
      for (const student of sectionStudents) {
        for (const subject of subjects) {
          // Generate realistic marks (65-95)
          const marksObtained = Math.floor(Math.random() * 31) + 65;
          
          marks.push({
            studentId: student.id,
            subjectId: subject.id,
            marksObtained,
            totalMarks: 100,
            remarks: marksObtained >= 90 ? 'Excellent' : marksObtained >= 75 ? 'Good' : marksObtained >= 60 ? 'Average' : 'Needs Improvement'
          });
        }
      }
      
      // Save marks
      await fetch(`${this.backendUrl}/api/sms/exams/${examId}/marks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(marks)
      });
    }
  }

  async runPhase2() {
    console.log('🚀 PHASE 2: FULL ACADEMIC YEAR DATA SIMULATION');
    console.log('===============================================');
    
    // Login to existing schools
    const schoolCredentials = [
      { id: 'greenwood-academy', email: 'admin.greenwood@campus-sim.edu' },
      { id: 'riverside-high', email: 'admin.riverside@campus-sim.edu' }
    ];
    
    for (const school of schoolCredentials) {
      try {
        console.log(`\n📋 Processing ${school.id}...`);
        
        // Login
        const token = await this.login(school.email, 'admin123456');
        this.tokens.set(school.id, token);
        
        // Get school data
        const data = await this.getSchoolData(school.id);
        this.schools.set(school.id, data.school);
        this.users.set(school.id, data.users);
        
        // Enroll students
        await this.enrollStudents(school.id);
        
        // Create timetable
        await this.createTimetable(school.id);
        
        // Create assignments
        await this.createAssignments(school.id);
        
        // Record attendance
        await this.recordAttendance(school.id);
        
        // Create exams
        await this.createExams(school.id);
        
        console.log(`✅ ${school.id} academic data simulation complete!\n`);
        
      } catch (error) {
        console.error(`❌ Failed to process ${school.id}:`, error.message);
      }
    }
    
    console.log('🎯 PHASE 2 COMPLETE: Full academic year data simulation finished');
  }
}

// Run Phase 2
if (import.meta.url === `file://${process.argv[1]}`) {
  const simulation = new AcademicYearDataSimulation();
  simulation.runPhase2().catch(console.error);
}

export default AcademicYearDataSimulation;
