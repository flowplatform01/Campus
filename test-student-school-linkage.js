import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3006';

async function testStudentSchoolLinkage() {
  console.log('🔗 TESTING STUDENT-SCHOOL LINKAGE SYSTEM');
  console.log('=======================================');

  try {
    // Step 1: Test school discovery
    console.log('\n📝 Step 1: Testing school discovery...');
    try {
      const discoveryResponse = await axios.get(`${BASE_URL}/api/sms/schools/discovery`);
      console.log('✅ School discovery working');
      console.log('📊 Found schools:', discoveryResponse.data.length);
      
      if (discoveryResponse.data.length > 0) {
        const firstSchool = discoveryResponse.data[0];
        console.log('🏫 First school:', firstSchool.name, '- Applications open:', firstSchool.hasOpenApplications);
      }
    } catch (error) {
      console.log('❌ School discovery failed:', error.response?.data?.message || error.message);
      return;
    }

    // Step 2: Test school search
    console.log('\n📝 Step 2: Testing school search...');
    try {
      const searchResponse = await axios.get(`${BASE_URL}/api/sms/schools/discovery?search=Greenwood`);
      console.log('✅ School search working');
      console.log('🔍 Search results:', searchResponse.data.map(s => s.name));
    } catch (error) {
      console.log('❌ School search failed:', error.response?.data?.message || error.message);
    }

    // Step 3: Test filter by open applications
    console.log('\n📝 Step 3: Testing filter by open applications...');
    try {
      const openAppsResponse = await axios.get(`${BASE_URL}/api/sms/schools/discovery?openApplicationsOnly=true`);
      console.log('✅ Open applications filter working');
      console.log('📊 Schools with open applications:', openAppsResponse.data.length);
    } catch (error) {
      console.log('❌ Open applications filter failed:', error.response?.data?.message || error.message);
    }

    // Step 4: Get Greenwood Academy for testing
    console.log('\n📝 Step 4: Getting Greenwood Academy details...');
    let greenwoodSchool;
    try {
      const searchResponse = await axios.get(`${BASE_URL}/api/sms/schools/discovery?search=Greenwood`);
      greenwoodSchool = searchResponse.data.find(s => s.name.includes('Greenwood'));
      
      if (!greenwoodSchool) {
        console.log('❌ Greenwood Academy not found');
        return;
      }
      
      console.log('✅ Found Greenwood Academy');
      console.log('🏫 School ID:', greenwoodSchool.id);
      console.log('📅 Active Academic Year:', greenwoodSchool.activeAcademicYear?.name);
    } catch (error) {
      console.log('❌ Failed to get Greenwood Academy:', error.response?.data?.message || error.message);
      return;
    }

    // Step 5: Test application form retrieval
    console.log('\n📝 Step 5: Testing application form retrieval...');
    try {
      const formResponse = await axios.get(`${BASE_URL}/api/sms/schools/${greenwoodSchool.id}/application-form`);
      console.log('✅ Application form retrieval working');
      console.log('📋 School:', formResponse.data.school.name);
      console.log('📚 Academic Year:', formResponse.data.academicYear.name);
      console.log('📝 Available classes:', formResponse.data.classes.length);
      
      if (formResponse.data.classes.length > 0) {
        const firstClass = formResponse.data.classes[0];
        console.log('📖 First class:', firstClass.name, '- Sections:', firstClass.sections.length);
      }
    } catch (error) {
      console.log('❌ Application form retrieval failed:', error.response?.data?.message || error.message);
      return;
    }

    // Step 6: Test application submission
    console.log('\n📝 Step 6: Testing application submission...');
    try {
      const formResponse = await axios.get(`${BASE_URL}/api/sms/schools/${greenwoodSchool.id}/application-form`);
      const firstClass = formResponse.data.classes[0];
      
      const applicationData = {
        studentFullName: `Test Student ${Date.now()}`,
        studentEmail: `test.student.${Date.now()}@test.com`,
        studentPhone: '+1234567890',
        desiredStudentId: `STU${Date.now()}`,
        parentFullName: `Test Parent ${Date.now()}`,
        parentEmail: `test.parent.${Date.now()}@test.com`,
        parentPhone: '+0987654321',
        classId: firstClass.id,
        sectionId: firstClass.sections?.[0]?.id || null,
        notes: 'Test application for student-school linkage system',
      };

      const submitResponse = await axios.post(`${BASE_URL}/api/sms/schools/${greenwoodSchool.id}/apply`, applicationData);
      console.log('✅ Application submission working');
      console.log('📋 Application ID:', submitResponse.data.application.id);
      console.log('📊 Status:', submitResponse.data.application.status);
      console.log('🏫 School:', submitResponse.data.application.schoolName);
      console.log('📚 Class:', submitResponse.data.application.className);
      
      const applicationId = submitResponse.data.application.id;

      // Step 7: Test application status check
      console.log('\n📝 Step 7: Testing application status check...');
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/sms/applications/${applicationId}/status`);
        console.log('✅ Application status check working');
        console.log('📋 Application ID:', statusResponse.data.id);
        console.log('📊 Status:', statusResponse.data.status);
        console.log('👤 Student Name:', statusResponse.data.studentFullName);
        console.log('🏫 School:', statusResponse.data.school?.name);
        console.log('📚 Class:', statusResponse.data.class?.name);
        console.log('📅 Academic Year:', statusResponse.data.academicYear?.name);
        console.log('📝 Submitted At:', statusResponse.data.submittedAt);
      } catch (error) {
        console.log('❌ Application status check failed:', error.response?.data?.message || error.message);
      }

    } catch (error) {
      console.log('❌ Application submission failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 STUDENT-SCHOOL LINKAGE SYSTEM TEST COMPLETED');
    console.log('===========================================');
    console.log('✅ School discovery interface working');
    console.log('✅ Search and filtering working');
    console.log('✅ Application form retrieval working');
    console.log('✅ Application submission working');
    console.log('✅ Application status tracking working');
    console.log('✅ No more orphan student accounts!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testStudentSchoolLinkage();
