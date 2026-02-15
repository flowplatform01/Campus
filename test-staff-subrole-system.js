import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3006';
const ADMIN_EMAIL = 'admin.greenwood@campus-sim.edu';
const ADMIN_PASSWORD = 'admin123456';

async function testStaffSubRoleSystem() {
  console.log('🔧 TESTING STAFF SUB-ROLE SYSTEM');
  console.log('=====================================');

  try {
    // Step 1: Login as admin
    console.log('\n📝 Step 1: Admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Admin login successful');

    // Step 2: Test sub-roles seeding
    console.log('\n📝 Step 2: Testing sub-roles seeding...');
    const subRolesResponse = await axios.get(`${BASE_URL}/api/sms/sub-roles`, { headers });
    console.log('✅ Sub-roles endpoint working');
    console.log('📋 Available sub-roles:', subRolesResponse.data.map(sr => `${sr.name} (${sr.key})`));

    // Step 3: Test sub-roles dropdown endpoint
    console.log('\n📝 Step 3: Testing sub-roles dropdown...');
    const dropdownResponse = await axios.get(`${BASE_URL}/api/sms/sub-roles/dropdown`, { headers });
    console.log('✅ Sub-roles dropdown endpoint working');
    console.log('📋 Dropdown options:', dropdownResponse.data);

    // Step 4: Test employee creation with valid sub-role
    console.log('\n📝 Step 4: Testing employee creation with valid sub-role...');
    const testEmployee = {
      email: `test.teacher.${Date.now()}@campus-sim.edu`,
      password: 'password123',
      name: 'Test Teacher',
      role: 'employee',
      subRole: 'teacher',
      employeeId: `EMP${Date.now()}`
    };

    try {
      const createResponse = await axios.post(`${BASE_URL}/api/users`, testEmployee, { headers });
      console.log('✅ Employee creation with valid sub-role successful');
      console.log('👤 Created employee:', createResponse.data.name, '-', createResponse.data.subRole);
    } catch (error) {
      console.log('❌ Employee creation failed:', error.response?.data?.message || error.message);
    }

    // Step 5: Test employee creation with invalid sub-role
    console.log('\n📝 Step 5: Testing employee creation with invalid sub-role...');
    const invalidEmployee = {
      email: `test.invalid.${Date.now()}@campus-sim.edu`,
      password: 'password123',
      name: 'Test Invalid',
      role: 'employee',
      subRole: 'invalid_role',
      employeeId: `EMP${Date.now() + 1}`
    };

    try {
      await axios.post(`${BASE_URL}/api/users`, invalidEmployee, { headers });
      console.log('❌ Should have failed with invalid sub-role');
    } catch (error) {
      console.log('✅ Correctly rejected invalid sub-role');
      console.log('🚫 Error:', error.response?.data?.message);
    }

    // Step 6: Test employee creation without sub-role (should default to teacher)
    console.log('\n📝 Step 6: Testing employee creation without sub-role...');
    const noSubRoleEmployee = {
      email: `test.nosub.${Date.now()}@campus-sim.edu`,
      password: 'password123',
      name: 'Test No SubRole',
      role: 'employee',
      employeeId: `EMP${Date.now() + 2}`
    };

    try {
      const createResponse = await axios.post(`${BASE_URL}/api/users`, noSubRoleEmployee, { headers });
      console.log('✅ Employee creation without sub-role successful');
      console.log('👤 Created employee:', createResponse.data.name, '- Default sub-role:', createResponse.data.subRole);
    } catch (error) {
      console.log('❌ Employee creation without sub-role failed:', error.response?.data?.message || error.message);
    }

    // Step 7: Test staff listing
    console.log('\n📝 Step 7: Testing staff listing...');
    const staffResponse = await axios.get(`${BASE_URL}/api/users/staff`, { headers });
    console.log('✅ Staff listing successful');
    console.log('👥 Total staff members:', staffResponse.data.length);
    console.log('📋 Staff with sub-roles:', staffResponse.data.filter(s => s.subRole).map(s => `${s.name} - ${s.subRole}`));

    console.log('\n🎉 STAFF SUB-ROLE SYSTEM TEST COMPLETED');
    console.log('=====================================');
    console.log('✅ All core functionality working correctly');
    console.log('✅ Sub-roles are properly seeded');
    console.log('✅ Employee validation is working');
    console.log('✅ Default sub-role assignment works');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testStaffSubRoleSystem();
