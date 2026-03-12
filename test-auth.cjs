const userData = {
  email: "test@campus.com",
  password: "test123456",
  name: "Test User",
  role: "admin",
  schoolName: "Test School"
};

async function testRegister() {
  try {
    const response = await fetch('http://localhost:3006/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    console.log('Registration result:', result);
    
    if (response.ok) {
      console.log('✅ User created successfully!');
      console.log('You can now login with:', userData.email, userData.password);
    } else {
      console.log('❌ Registration failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testLogin() {
  try {
    const loginData = {
      email: "test@campus.com",
      password: "test123456"
    };
    
    const response = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    const result = await response.json();
    console.log('Login result:', result);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('Access Token:', result.accessToken.substring(0, 50) + '...');
    } else {
      console.log('❌ Login failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

console.log('🧪 Testing Campus Authentication...');
console.log('1. Testing registration...');
testRegister().then(() => {
  console.log('2. Testing login...');
  testLogin();
});
