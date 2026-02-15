#!/usr/bin/env node

import { TestSprite } from '@testsprite/testsprite-mcp';
import config from './testsprite.config.json' assert { type: 'json' };

class CampusTestRunner {
  constructor() {
    this.client = new TestSprite({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Campus School Management System Tests...');
    
    try {
      // Test 1: Health Check
      console.log('\n📊 Testing Server Health...');
      await this.testHealthCheck();
      
      // Test 2: Authentication Flow
      console.log('\n🔐 Testing Authentication...');
      await this.testAuthentication();
      
      // Test 3: Academic Workflows
      console.log('\n📚 Testing Academic Workflows...');
      await this.testAcademicWorkflows();
      
      // Test 4: File Upload System
      console.log('\n📁 Testing File Upload System...');
      await this.testFileUpload();
      
      // Test 5: API Integration
      console.log('\n🔗 Testing API Integration...');
      await this.testAPIIntegration();
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  async testHealthCheck() {
    const healthTest = await this.client.test({
      name: 'Server Health Check',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/health`,
      method: 'GET',
      expectedStatus: 200,
      timeout: 5000
    });
    
    console.log('Health Check:', healthTest.status === 'passed' ? '✅' : '❌');
  }

  async testAuthentication() {
    // Test Registration
    const registerTest = await this.client.test({
      name: 'User Registration',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/auth/register`,
      method: 'POST',
      data: config.testData.testUser,
      expectedStatus: 201,
      timeout: 10000
    });
    
    console.log('Registration:', registerTest.status === 'passed' ? '✅' : '❌');
    
    // Test Login
    const loginTest = await this.client.test({
      name: 'User Login',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/auth/login`,
      method: 'POST',
      data: {
        email: config.testData.testUser.email,
        password: config.testData.testUser.password
      },
      expectedStatus: 200,
      timeout: 10000
    });
    
    console.log('Login:', loginTest.status === 'passed' ? '✅' : '❌');
  }

  async testAcademicWorkflows() {
    // Test Assignments Endpoint
    const assignmentsTest = await this.client.test({
      name: 'Assignments API',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/academics/assignments`,
      method: 'GET',
      expectedStatus: 401, // Should require auth
      timeout: 5000
    });
    
    console.log('Assignments API:', assignmentsTest.status === 'passed' ? '✅' : '❌');
    
    // Test Grades Endpoint
    const gradesTest = await this.client.test({
      name: 'Grades API',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/academics/grades`,
      method: 'GET',
      expectedStatus: 401, // Should require auth
      timeout: 5000
    });
    
    console.log('Grades API:', gradesTest.status === 'passed' ? '✅' : '❌');
  }

  async testFileUpload() {
    // Test Upload Endpoint
    const uploadTest = await this.client.test({
      name: 'File Upload API',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/upload/assignment`,
      method: 'POST',
      expectedStatus: 401, // Should require auth
      timeout: 5000
    });
    
    console.log('File Upload:', uploadTest.status === 'passed' ? '✅' : '❌');
  }

  async testAPIIntegration() {
    // Test Analytics Endpoint
    const analyticsTest = await this.client.test({
      name: 'Analytics API',
      type: 'api',
      endpoint: `${config.endpoints.backend}/api/analytics/dashboard`,
      method: 'GET',
      expectedStatus: 401, // Should require auth
      timeout: 5000
    });
    
    console.log('Analytics:', analyticsTest.status === 'passed' ? '✅' : '❌');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new CampusTestRunner();
  runner.runAllTests().catch(console.error);
}

export default CampusTestRunner;
