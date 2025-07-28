import { http, HttpResponse } from 'msw';

// Mock user data
const mockUsers = new Map();
let nextUserId = 1;

export const handlers = [
  // Auth status endpoint
  http.get('/api/auth/status', ({ request }) => {
    const url = new URL(request.url);
    const sessionCookie = request.headers.get('cookie');
    
    // Simple mock: if there's a session cookie with 'authenticated=true', return authenticated
    if (sessionCookie && sessionCookie.includes('authenticated=true')) {
      return HttpResponse.json({
        status: 'Authenticated',
        authenticated: true,
        user: {
          id: 'mock-user-1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        }
      });
    }
    
    return HttpResponse.json({
      status: 'Unauthenticated',
      authenticated: false
    });
  }),

  // Registration endpoint
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json();
    const { email, password, auth_code, first_name, last_name } = body;

    // Validate required fields
    if (!email || !password || !auth_code) {
      return HttpResponse.json(
        { error: 'Email, password, and auth_code are required' },
        { status: 400 }
      );
    }

    // Validate auth code (mock validation)
    if (auth_code !== 'test') {
      return HttpResponse.json(
        { error: 'Invalid authentication code' },
        { status: 401 }
      );
    }

    // Check if email already exists
    for (const [id, user] of mockUsers) {
      if (user.email === email) {
        return HttpResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Create new user
    const newUser = {
      id: `mock-user-${nextUserId++}`,
      email,
      first_name: first_name || '',
      last_name: last_name || '',
      password, // In real app, this would be hashed
      is_active: true,
      email_verified: false
    };

    mockUsers.set(newUser.id, newUser);

    return HttpResponse.json(
      { 
        message: 'User registered successfully', 
        user_id: newUser.id 
      },
      { status: 201 }
    );
  }),

  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return HttpResponse.json(
        { error: 'Invalid email or password', authenticated: false },
        { status: 401 }
      );
    }

    // Find user by email and password
    let authenticatedUser = null;
    for (const [id, user] of mockUsers) {
      if (user.email === email && user.password === password) {
        authenticatedUser = user;
        break;
      }
    }

    if (authenticatedUser) {
      return HttpResponse.json({
        message: 'Login successful',
        user_id: authenticatedUser.id,
        authenticated: true,
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          first_name: authenticatedUser.first_name,
          last_name: authenticatedUser.last_name
        }
      }, {
        headers: {
          'Set-Cookie': 'authenticated=true; Path=/'
        }
      });
    } else {
      return HttpResponse.json(
        { error: 'Invalid email or password', authenticated: false },
        { status: 401 }
      );
    }
  }),

  // Logout endpoint
  http.get('/api/auth/logout', () => {
    return HttpResponse.json(
      { message: 'Logged out successfully', authenticated: false },
      {
        headers: {
          'Set-Cookie': 'authenticated=; Path=/; Max-Age=0'
        }
      }
    );
  }),

  // Test cleanup endpoint
  http.delete('/api/users/test-cleanup', async ({ request }) => {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return HttpResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    let deleted = false;
    for (const [id, user] of mockUsers) {
      if (user.email === email) {
        mockUsers.delete(id);
        deleted = true;
        break;
      }
    }
    
    return HttpResponse.json({
      message: 'User cleaned up successfully',
      deleted
    });
  })
];

// Helper function to reset mock data between tests
export const resetMockUsers = () => {
  mockUsers.clear();
  nextUserId = 1;
};

// Helper function to add a pre-existing user
export const addMockUser = (userData) => {
  const user = {
    id: `mock-user-${nextUserId++}`,
    is_active: true,
    email_verified: false,
    ...userData
  };
  mockUsers.set(user.id, user);
  return user;
};
