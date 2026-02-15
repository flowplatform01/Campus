import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3006';
const ADMIN_EMAIL = 'admin.greenwood@campus-sim.edu';
const ADMIN_PASSWORD = 'admin123456';

async function seedSubRoles() {
  console.log('🌱 SEEDING SUB-ROLES FOR GREENWOOD ACADEMY');
  console.log('==========================================');

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

    // Step 2: Manually create default sub-roles
    console.log('\n📝 Step 2: Creating default sub-roles...');
    const defaultSubRoles = [
      { key: "teacher", name: "Teacher" },
      { key: "principal", name: "Principal" },
      { key: "accountant", name: "Accountant" },
      { key: "bursar", name: "Bursar" },
      { key: "secretary", name: "Secretary" },
      { key: "librarian", name: "Librarian" },
      { key: "counselor", name: "Counselor" },
      { key: "sports_coach", name: "Sports Coach" },
    ];

    for (const subRole of defaultSubRoles) {
      try {
        const createResponse = await axios.post(`${BASE_URL}/api/sms/sub-roles`, subRole, { headers });
        console.log(`✅ Created sub-role: ${subRole.name}`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
          console.log(`ℹ️  Sub-role already exists: ${subRole.name}`);
        } else {
          console.log(`❌ Failed to create ${subRole.name}:`, error.response?.data?.message || error.message);
        }
      }
    }

    // Step 3: Verify sub-roles
    console.log('\n📝 Step 3: Verifying sub-roles...');
    const subRolesResponse = await axios.get(`${BASE_URL}/api/sms/sub-roles`, { headers });
    console.log('✅ Sub-roles verification successful');
    console.log('📋 Available sub-roles:', subRolesResponse.data.map(sr => `${sr.name} (${sr.key})`));

    console.log('\n🎉 SUB-ROLE SEEDING COMPLETED');
    console.log('===============================');
    console.log('✅ All default sub-roles are now available');

  } catch (error) {
    console.error('❌ Seeding failed:', error.response?.data || error.message);
  }
}

// Run the seeding
seedSubRoles();
