# Tests

This directory will contain tests for the Klaviyo Analysis application.

## Test Structure (To Be Implemented)

```
tests/
├── unit/           # Unit tests for individual functions/components
│   ├── services/   # Test analysis.service, klaviyo.service, etc.
│   ├── lib/        # Test encryption, rate-limit, audit, etc.
│   └── components/ # Test React components
├── integration/    # Integration tests for API routes
│   ├── auth/       # Test signup, login, logout
│   ├── analysis/   # Test analysis creation and execution
│   └── user/       # Test profile updates, settings
└── e2e/           # End-to-end tests (optional)
    └── workflows/  # Test complete user workflows
```

## Testing Framework (Recommended)

We recommend using:
- **Jest** - Test runner and assertion library
- **React Testing Library** - For component tests
- **Supertest** - For API route testing
- **MSW (Mock Service Worker)** - For mocking Klaviyo API

## Getting Started

### 1. Install Testing Dependencies

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### 2. Create Jest Configuration

Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### 3. Update package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Example Tests

### Unit Test Example
```typescript
// tests/unit/lib/encryption.test.ts
import { hashPassword, verifyPassword } from '@/lib/encryption'

describe('Password Encryption', () => {
  it('should hash a password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should verify a correct password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should reject an incorrect password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword('wrongpassword', hash)
    expect(isValid).toBe(false)
  })
})
```

### Integration Test Example
```typescript
// tests/integration/auth/signup.test.ts
import { POST } from '@/app/api/auth/signup/route'
import { prisma } from '@/lib/prisma'

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    })
  })

  it('should create a new user', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass123',
        name: 'Test User'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('test@example.com')
  })

  it('should reject duplicate email', async () => {
    // Create user first
    await prisma.user.create({
      data: {
        email: 'existing@example.com',
        passwordHash: 'hash',
        name: 'Existing User'
      }
    })

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'testpass123',
        name: 'Test User'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('already exists')
  })
})
```

## Priority Test Cases

### Phase 1: Critical Path Tests
1. **Authentication**
   - User signup with valid data
   - User login with correct credentials
   - User login with incorrect credentials
   - Account lockout after 5 failed attempts

2. **Analysis**
   - Create analysis with valid parameters
   - Analysis execution (mocked Klaviyo API)
   - Analysis results retrieval

3. **Security**
   - Password hashing and verification
   - API key encryption and decryption
   - Rate limiting enforcement
   - Audit log creation

### Phase 2: Edge Cases
1. Invalid input handling
2. Database connection failures
3. Redis connection failures
4. Klaviyo API errors

### Phase 3: Performance
1. Load testing for analysis execution
2. Concurrent user handling
3. Rate limit thresholds

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Coverage Goals

- **Target:** 80% code coverage
- **Minimum:** 60% code coverage for CI to pass
- **Critical paths:** 100% coverage (auth, analysis execution)

## CI Integration

Tests run automatically on:
- Every pull request
- Every push to main/develop branches
- Before deployment

CI will fail if:
- Any test fails
- Coverage drops below minimum threshold
- Type checking fails
- Linting fails

## Current Status

⚠️ **No tests implemented yet**

The `npm test` command currently runs `lint` and `type-check` as a placeholder.
This ensures CI doesn't fail while tests are being developed.

## TODO

- [ ] Set up Jest and testing libraries
- [ ] Create jest.config.js
- [ ] Write unit tests for encryption utilities
- [ ] Write unit tests for rate limiting
- [ ] Write integration tests for auth endpoints
- [ ] Write integration tests for analysis endpoints
- [ ] Set up test database fixtures
- [ ] Mock Klaviyo API responses
- [ ] Add E2E tests (optional)
- [ ] Set up coverage reporting
- [ ] Update GitHub Actions to run real tests

