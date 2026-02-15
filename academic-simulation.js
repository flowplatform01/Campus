import fetch from 'node-fetch';

class AcademicYearSimulation {
  constructor() {
    this.backendUrl = "http://localhost:3006";
    this.tokens = new Map(); // Store tokens for different users
    this.schools = new Map(); // Store created schools
    this.users = new Map(); // Store created users
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

  async createSchool(schoolData) {
    console.log(`🏫 Creating school: ${schoolData.name}`);
    
    // First register as admin for this school
    const registerResponse = await fetch(`${this.backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: schoolData.adminEmail,
        password: 'admin123456',
        name: schoolData.adminName,
        role: 'admin',
        schoolName: schoolData.name
      })
    });
    
    const registerResult = await registerResponse.json().catch(() => null);
    if (registerResponse.status !== 201) {
      throw new Error(`School registration failed: ${registerResult?.message}`);
    }
    
    // Login to get token
    const token = await this.login(schoolData.adminEmail, 'admin123456');
    this.tokens.set(schoolData.id, token);
    
    // Update school branding
    const brandingResponse = await fetch(`${this.backendUrl}/api/sms/school`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: schoolData.name,
        address: schoolData.address,
        phone: schoolData.phone,
        email: schoolData.email
      })
    });
    
    if (brandingResponse.ok) {
      const school = await brandingResponse.json();
      this.schools.set(schoolData.id, school);
      console.log(`✅ School created: ${schoolData.name} (ID: ${school.id})`);
      return school;
    } else {
      throw new Error('School branding update failed');
    }
  }

  async createUser(schoolId, userData) {
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    const response = await fetch(`${this.backendUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json().catch(() => null);
    if (response.status === 201) {
      console.log(`✅ User created: ${userData.name} (${userData.role})`);
      return result;
    } else {
      throw new Error(`User creation failed: ${result?.message}`);
    }
  }

  async createAcademicStructure(schoolId) {
    const token = this.tokens.get(schoolId);
    if (!token) throw new Error('No token for school');
    
    console.log(`📚 Creating academic structure for school ${schoolId}`);
    
    // Create Academic Year
    const yearResponse = await fetch(`${this.backendUrl}/api/sms/academic-years`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '2024-2025',
        startDate: '2024-09-01T00:00:00.000Z',
        endDate: '2025-07-31T23:59:59.999Z',
        isActive: true
      })
    });
    
    const academicYear = await yearResponse.json().catch(() => null);
    if (yearResponse.status !== 201) {
      throw new Error('Academic year creation failed');
    }
    
    // Create Terms
    const terms = [];
    for (let i = 1; i <= 3; i++) {
      const termResponse = await fetch(`${this.backendUrl}/api/sms/terms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          academicYearId: academicYear.id,
          name: `Term ${i}`,
          startDate: `2024-${String(i * 3).padStart(2, '0')}-01T00:00:00.000Z`,
          endDate: `2024-${String(i * 3 + 2).padStart(2, '0')}-28T23:59:59.999Z`
        })
      });
      
      const term = await termResponse.json().catch(() => null);
      if (termResponse.status === 201) {
        terms.push(term);
        console.log(`✅ Term created: ${term.name}`);
      }
    }
    
    // Create Classes
    const classes = [];
    const classNames = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
    for (let i = 0; i < classNames.length; i++) {
      const classResponse = await fetch(`${this.backendUrl}/api/sms/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: classNames[i],
          sortOrder: i + 1
        })
      });
      
      const classObj = await classResponse.json().catch(() => null);
      if (classResponse.status === 201) {
        classes.push(classObj);
        console.log(`✅ Class created: ${classObj.name}`);
        
        // Create sections for each class
        for (let j = 1; j <= 2; j++) {
          const sectionResponse = await fetch(`${this.backendUrl}/api/sms/sections`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              classId: classObj.id,
              name: `Section ${j}`
            })
          });
          
          const section = await sectionResponse.json().catch(() => null);
          if (sectionResponse.status === 201) {
            console.log(`✅ Section created: ${classObj.name} - ${section.name}`);
          }
        }
      }
    }
    
    // Create Subjects
    const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Physical Education'];
    for (const subjectName of subjects) {
      const subjectResponse = await fetch(`${this.backendUrl}/api/sms/subjects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: subjectName,
          code: subjectName.substring(0, 3).toUpperCase()
        })
      });
      
      const subject = await subjectResponse.json().catch(() => null);
      if (subjectResponse.status === 201) {
        console.log(`✅ Subject created: ${subject.name}`);
      }
    }
    
    return { academicYear, terms, classes };
  }

  async runPhase1() {
    console.log('🚀 PHASE 1: MULTI-SCHOOL SIMULATION SETUP');
    console.log('==========================================');
    
    const schoolConfigs = [
      {
        id: 'greenwood-academy',
        name: 'Greenwood Academy',
        adminEmail: 'admin.greenwood@campus-sim.edu',
        adminName: 'Dr. Sarah Mitchell',
        address: '123 Education Boulevard, Learning City, LC 12345',
        phone: '+1-555-0101',
        email: 'info@greenwood.edu',
        type: 'private',
        motto: 'Excellence in Education',
        focus: 'STEM & Technology'
      },
      {
        id: 'riverside-high',
        name: 'Riverside High School',
        adminEmail: 'admin.riverside@campus-sim.edu',
        adminName: 'Mr. James Anderson',
        address: '456 River Road, Riverside, RS 67890',
        phone: '+1-555-0102',
        email: 'info@riverside.edu',
        type: 'public',
        motto: 'Building Tomorrow\'s Leaders',
        focus: 'Arts & Humanities'
      },
      {
        id: 'mountain-view-elementary',
        name: 'Mountain View Elementary',
        adminEmail: 'admin.mountainview@campus-sim.edu',
        adminName: 'Ms. Patricia Chen',
        address: '789 Mountain Peak, Highland, HL 11223',
        phone: '+1-555-0103',
        email: 'info@mountainview.edu',
        type: 'public',
        motto: 'Growing Young Minds',
        focus: 'Early Childhood Education'
      },
      {
        id: 'tech-innovation-institute',
        name: 'Tech Innovation Institute',
        adminEmail: 'admin.techinstitute@campus-sim.edu',
        adminName: 'Dr. Robert Kumar',
        address: '321 Innovation Drive, Tech Valley, TV 44556',
        phone: '+1-555-0104',
        email: 'info@techinstitute.edu',
        type: 'private',
        motto: 'Innovate. Create. Transform.',
        focus: 'Advanced Technology & AI'
      }
    ];
    
    // Create schools
    for (const config of schoolConfigs) {
      try {
        await this.createSchool(config);
        await this.createAcademicStructure(config.id);
        
        // Create staff for each school
        await this.createStaffForSchool(config.id);
        
        // Create students for each school
        await this.createStudentsForSchool(config.id);
        
        console.log(`\n✅ ${config.name} setup complete!\n`);
      } catch (error) {
        console.error(`❌ Failed to setup ${config.name}:`, error.message);
      }
    }
    
    console.log('🎯 PHASE 1 COMPLETE: Multi-school simulation setup finished');
  }

  async createStaffForSchool(schoolId) {
    const staffConfigs = [
      { role: 'employee', subRole: 'teacher', name: 'John Smith', email: `teacher1.${schoolId}@campus-sim.edu` },
      { role: 'employee', subRole: 'teacher', name: 'Emily Johnson', email: `teacher2.${schoolId}@campus-sim.edu` },
      { role: 'employee', subRole: 'teacher', name: 'Michael Brown', email: `teacher3.${schoolId}@campus-sim.edu` },
      { role: 'employee', subRole: 'principal', name: 'David Wilson', email: `principal.${schoolId}@campus-sim.edu` },
      { role: 'employee', subRole: 'bursar', name: 'Lisa Davis', email: `bursar.${schoolId}@campus-sim.edu` }
    ];
    
    for (const staff of staffConfigs) {
      await this.createUser(schoolId, {
        ...staff,
        password: 'staff123456',
        employeeId: `${staff.subRole.toUpperCase()}${Math.floor(Math.random() * 1000)}`
      });
    }
  }

  async createStudentsForSchool(schoolId) {
    const studentNames = [
      'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Ethan Hunt',
      'Fiona Green', 'George Miller', 'Hannah Lee', 'Ian McKellen', 'Julia Roberts',
      'Kevin Hart', 'Linda Wilson', 'Mark Zuckerberg', 'Nancy Drew', 'Oliver Twist'
    ];
    
    for (let i = 0; i < studentNames.length; i++) {
      const [firstName, lastName] = studentNames[i].split(' ');
      await this.createUser(schoolId, {
        role: 'student',
        name: studentNames[i],
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}.${schoolId}@campus-sim.edu`,
        password: 'student123456',
        studentId: `STU${String(i + 1).padStart(4, '0')}`,
        grade: `Grade ${Math.floor(i / 3) + 1}`,
        classSection: `Section ${(i % 2) + 1}`
      });
      
      // Create parent for each student
      await this.createUser(schoolId, {
        role: 'parent',
        name: `Parent of ${studentNames[i]}`,
        email: `parent.${firstName.toLowerCase()}${i}.${schoolId}@campus-sim.edu`,
        password: 'parent123456'
      });
    }
  }
}

// Run Phase 1
if (import.meta.url === `file://${process.argv[1]}`) {
  const simulation = new AcademicYearSimulation();
  simulation.runPhase1().catch(console.error);
}

export default AcademicYearSimulation;
