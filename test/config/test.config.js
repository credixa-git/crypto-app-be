const dotenv = require("dotenv");
const path = require("path");

// Load test environment variables
dotenv.config({ path: path.join(__dirname, "../../.env.test") });

// Test configuration
const testConfig = {
  // Database
  database:
    process.env.TEST_DATABASE || "mongodb://localhost:27017/crypto-port-test",

  // JWT
  jwtSecret: process.env.TEST_JWT_SECRET || "test-jwt-secret",
  jwtExpiry: "1h",

  // OTP
  otpExpiry: 1, // 1 minute for faster tests

  // AWS (mock for testing)
  aws: {
    region: "us-east-1",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    ses: {
      fromEmail: "test@example.com",
      fromName: "Test App",
    },
  },

  // Server
  port: process.env.TEST_PORT || 3001,

  // Test data
  testUser: {
    name: "Test User",
    email: "test@example.com",
    password: "testpassword123",
  },

  testUser2: {
    name: "Test User 2",
    email: "test2@example.com",
    password: "testpassword456",
  },
};

module.exports = testConfig;
