# Testing Documentation

## Overview

This directory contains comprehensive test cases for the Crypto Port authentication system, including:

- **Authentication Flow Tests** (`auth.test.js`)
- **Email Service Tests** (`emailService.test.js`)
- **Test Helpers and Mocks**
- **Test Configuration**

## Test Coverage

### Authentication System Tests

- ✅ User Model Tests (Password Hashing, OTP Generation, Verification)
- ✅ Signup Flow Tests
- ✅ Login Flow Tests (with OTP requirement)
- ✅ OTP Verification Tests
- ✅ Forgot Password Flow Tests
- ✅ Password Reset Tests
- ✅ JWT Token Tests
- ✅ Error Handling Tests

### Email Service Tests

- ✅ OTP Email Generation (HTML & Text)
- ✅ Welcome Email Generation
- ✅ Email Sending (with AWS SES mocking)
- ✅ Email Content Validation
- ✅ Error Handling
- ✅ Edge Cases

## Setup Instructions

### 1. Install Dependencies

```bash
npm install --save-dev mocha chai supertest sinon
```

### 2. Create Test Environment File

Create a `.env.test` file in the root directory with:

```bash
# Test Environment Configuration
TEST_DATABASE=mongodb://localhost:27017/crypto-port-test
TEST_JWT_SECRET=test-jwt-secret-key-for-testing-only
TEST_JWT_EXPIRES_IN=1h
TEST_OTP_EXPIRY_MINUTES=1
TEST_PORT=3001
NODE_ENV=test
```

### 3. Start Test Database

Ensure MongoDB is running and accessible at the test database URL.

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npx mocha test/auth.test.js
npx mocha test/emailService.test.js
```

### Run Tests with Custom Reporter

```bash
npx mocha --reporter=nyan test/
npx mocha --reporter=dot test/
```

## Test Structure

### Test Helpers

- `db.helper.js` - Database connection and cleanup
- `server.helper.js` - Test server setup
- `config/test.config.js` - Test configuration

### Mocks

- `emailService.mock.js` - Mock email service for testing

### Test Files

- `auth.test.js` - Complete authentication flow tests
- `emailService.test.js` - Email service functionality tests
- `runner.js` - Test runner utility

## Test Data

The tests use predefined test users:

- **Test User 1**: `test@example.com` / `testpassword123`
- **Test User 2**: `test2@example.com` / `testpassword456`

## Test Scenarios

### 1. User Registration Flow

1. User submits signup form
2. System creates user account (unverified)
3. System generates verification OTP
4. System sends OTP email
5. User verifies OTP
6. Account marked as verified
7. Welcome email sent
8. JWT token issued

### 2. User Login Flow

1. User submits login credentials
2. System validates credentials
3. System generates login OTP
4. System sends OTP email
5. User verifies OTP
6. JWT token issued

### 3. Password Reset Flow

1. User requests password reset
2. System generates password reset OTP
3. System sends OTP email
4. User submits OTP + new password
5. System verifies OTP
6. Password updated
7. Confirmation sent

### 4. OTP Management

- OTP expiry handling
- Rate limiting (1-minute cooldown)
- Separate OTP fields for different purposes
- OTP verification and cleanup

## Mocking Strategy

### Email Service Mocking

- AWS SES calls are mocked to prevent actual emails
- Email content is captured for verification
- Error scenarios are simulated

### Database Mocking

- Test database is isolated from production
- Data is cleaned between tests
- Connection failures are handled gracefully

## Assertions and Expectations

### Chai Assertions

- `expect()` syntax for readable assertions
- Deep equality checking
- Async operation testing
- Error handling verification

### HTTP Response Testing

- Status code validation
- Response body structure verification
- Error message validation
- Header validation

## Best Practices

### Test Isolation

- Each test runs in isolation
- Database is cleaned between tests
- No shared state between tests

### Error Testing

- Both success and failure scenarios are tested
- Edge cases are covered
- Error messages are validated

### Performance

- Tests run quickly (15-second timeout)
- Database operations are optimized
- Async operations are properly handled

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Ensure MongoDB is running
   - Check test database URL in `.env.test`
   - Verify network connectivity

2. **Test Timeout**

   - Increase timeout in test configuration
   - Check for hanging async operations
   - Verify database performance

3. **Mock Failures**
   - Check sinon stub configuration
   - Verify mock service implementation
   - Ensure proper cleanup in afterEach

### Debug Mode

Run tests with verbose output:

```bash
npx mocha --reporter=spec --timeout=30000 test/
```

## Continuous Integration

### GitHub Actions

Tests can be integrated into CI/CD pipelines:

```yaml
- name: Run Tests
  run: npm test
  env:
    TEST_DATABASE: ${{ secrets.TEST_DATABASE }}
```

### Test Reports

Generate test coverage reports:

```bash
npm run test:coverage
```

## Contributing

### Adding New Tests

1. Follow existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Mock external dependencies
5. Clean up resources in afterEach

### Test Naming Convention

- Use descriptive test names
- Group related tests in describe blocks
- Use consistent assertion patterns
- Include edge case testing
