import { randomBytes } from 'crypto';

/**
 * Generate a unique test user for testing
 */
export function generateTestUser() {
  const timestamp = Date.now();
  const randomSuffix = randomBytes(4).toString('hex');
  
  return {
    email: `test-user-${timestamp}-${randomSuffix}@example.com`,
    password: 'TestPassword123!',
    authCode: 'test', // This matches the authorizationCode in backend/secrets.js
    firstName: 'Test',
    lastName: 'User',
    created: false // Track if user was actually created
  };
}

/**
 * Clean up test user by calling backend API to delete the user
 */
export async function cleanupTestUser(testUser) {
  try {
    const response = await fetch('http://localhost:13010/api/auth/test-cleanup', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testUser.email })
    });
    
    if (!response.ok) {
      console.warn(`Failed to cleanup test user ${testUser.email}:`, response.statusText);
    } else {
      const result = await response.json();
      console.log(`Cleanup result for ${testUser.email}:`, result);
    }
  } catch (error) {
    console.warn(`Error cleaning up test user ${testUser.email}:`, error.message);
  }
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a valid auth code for testing
 * Based on the auth code defined in backend/secrets.js
 */
export function getValidAuthCode() {
  return 'test';
}

/**
 * Generate random string for testing
 */
export function generateRandomString(length = 8) {
  return randomBytes(length).toString('hex').substring(0, length);
}
