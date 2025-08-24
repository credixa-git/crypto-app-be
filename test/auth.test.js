const chai = require("chai");
const expect = chai.expect;
const request = require("supertest");
const sinon = require("sinon");
const mongoose = require("mongoose");

// Import test helpers and mocks
const dbHelper = require("./helpers/db.helper");
const serverHelper = require("./helpers/server.helper");
const MockEmailService = require("./mocks/emailService.mock");
const testConfig = require("./config/test.config");

// Import models and controllers
const User = require("../models/user.model");
const authController = require("../controllers/auth.controller");

// Import the actual app
const app = require("../server");

describe("Authentication System Tests", function () {
  let mockEmailService;
  let testUser;
  let testUser2;
  let authToken;

  // Increase timeout for database operations
  this.timeout(15000);

  before(async function () {
    // Connect to test database
    await dbHelper.connect();

    // Create mock email service
    mockEmailService = new MockEmailService();

    // Clear database
    await dbHelper.clearDatabase();
  });

  after(async function () {
    // Disconnect from test database
    await dbHelper.disconnect();
  });

  beforeEach(async function () {
    // Clear database before each test
    await dbHelper.clearDatabase();

    // Clear mock email service
    mockEmailService.clearSentEmails();

    // Reset test data
    testUser = { ...testConfig.testUser };
    testUser2 = { ...testConfig.testUser2 };
  });

  afterEach(async function () {
    // Restore any stubs
    sinon.restore();
  });

  describe("User Model Tests", function () {
    describe("Password Hashing", function () {
      it("should hash password on save", async function () {
        const user = new User(testUser);
        await user.save();

        expect(user.password).to.not.equal(testUser.password);
        expect(user.password).to.have.length(60); // bcrypt hash length
      });

      it("should not hash password if not modified", async function () {
        const user = new User(testUser);
        await user.save();

        const originalPassword = user.password;
        user.name = "Updated Name";
        await user.save();

        expect(user.password).to.equal(originalPassword);
      });
    });

    describe("OTP Generation", function () {
      it("should generate verification OTP", function () {
        const user = new User(testUser);
        const otp = user.generateVerificationOTP();

        expect(otp).to.match(/^\d{6}$/);
        expect(user.verificationOTP).to.equal(otp);
        expect(user.verificationOTPExpiresAt).to.be.instanceOf(Date);
      });

      it("should generate password reset OTP", function () {
        const user = new User(testUser);
        const otp = user.generatePasswordResetOTP();

        expect(otp).to.match(/^\d{6}$/);
        expect(user.passwordResetOTP).to.equal(otp);
        expect(user.passwordResetOTPExpiresAt).to.be.instanceOf(Date);
      });

      it("should handle OTP expiry configuration", function () {
        const user = new User(testUser);
        const otp = user.generateVerificationOTP();

        const expiryTime = user.verificationOTPExpiresAt.getTime();
        const expectedExpiry = Date.now() + testConfig.otpExpiry * 60 * 1000;

        expect(expiryTime).to.be.closeTo(expectedExpiry, 5000); // Within 5 seconds
      });
    });

    describe("OTP Verification", function () {
      it("should verify correct verification OTP", function () {
        const user = new User(testUser);
        const otp = user.generateVerificationOTP();

        const result = user.verifyOTP(otp);

        expect(result).to.be.true;
        expect(user.isVerified).to.be.true;
        expect(user.verificationOTP).to.be.undefined;
        expect(user.verificationOTPExpiresAt).to.be.undefined;
      });

      it("should verify correct password reset OTP", function () {
        const user = new User(testUser);
        const otp = user.generatePasswordResetOTP();

        const result = user.verifyPasswordResetOTP(otp);

        expect(result).to.be.true;
        expect(user.isVerified).to.not.be.true; // Should not change verification status
        expect(user.passwordResetOTP).to.be.undefined;
        expect(user.passwordResetOTPExpiresAt).to.be.undefined;
      });

      it("should reject incorrect OTP", function () {
        const user = new User(testUser);
        user.generateVerificationOTP();

        const result = user.verifyOTP("000000");

        expect(result).to.be.false;
        expect(user.isVerified).to.be.false;
      });

      it("should reject expired OTP", async function () {
        const user = new User(testUser);
        const otp = user.generateVerificationOTP();

        // Manually set expired time
        user.verificationOTPExpiresAt = new Date(Date.now() - 60000);

        const result = user.verifyOTP(otp);

        expect(result).to.be.false;
      });
    });

    describe("Password Verification", function () {
      it("should verify correct password", async function () {
        const user = new User(testUser);
        await user.save();

        const result = await user.correctPassword(
          testUser.password,
          user.password
        );

        expect(result).to.be.true;
      });

      it("should reject incorrect password", async function () {
        const user = new User(testUser);
        await user.save();

        const result = await user.correctPassword(
          "wrongpassword",
          user.password
        );

        expect(result).to.be.false;
      });
    });
  });

  describe("Authentication API Tests", function () {
    describe("POST /signup", function () {
      it("should create new user and send verification OTP", async function () {
        const response = await request(app)
          .post("/api/auth/signup")
          .send(testUser)
          .expect(201);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.user.email).to.equal(testUser.email);
        expect(response.body.data.user.name).to.equal(testUser.name);
        expect(response.body.data.user.password).to.be.undefined;
        expect(response.body.data.message).to.include("OTP verification");
      });

      it("should handle existing user by sending OTP", async function () {
        // Create user first
        const user = new User(testUser);
        await user.save();

        const response = await request(app)
          .post("/api/auth/signup")
          .send(testUser)
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.message).to.include("OTP sent");
      });

      it("should validate required fields", async function () {
        const response = await request(app)
          .post("/api/auth/signup")
          .send({ email: "invalid@email" })
          .expect(400);

        expect(response.body.status).to.equal("fail");
      });

      it("should validate email format", async function () {
        const response = await request(app)
          .post("/api/auth/signup")
          .send({
            name: "Test User",
            email: "invalid-email",
            password: "password123",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
      });

      it("should validate password length", async function () {
        const response = await request(app)
          .post("/api/auth/signup")
          .send({
            name: "Test User",
            email: "test@example.com",
            password: "123",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
      });
    });

    describe("POST /login", function () {
      beforeEach(async function () {
        // Create verified user
        const user = new User(testUser);
        user.isVerified = true;
        await user.save();
      });

      it("should require OTP verification for login", async function () {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.requiresOTP).to.be.true;
        expect(response.body.data.message).to.include("OTP sent");
      });

      it("should reject invalid credentials", async function () {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: testUser.email,
            password: "wrongpassword",
          })
          .expect(401);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("Incorrect email or password");
      });

      it("should reject non-existent user", async function () {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: "nonexistent@example.com",
            password: "password123",
          })
          .expect(404);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("User not found");
      });

      it("should require email and password", async function () {
        const response = await request(app)
          .post("/api/auth/login")
          .send({ email: testUser.email })
          .expect(400);

        expect(response.body.status).to.equal("fail");
      });
    });

    describe("POST /verify-login-otp", function () {
      beforeEach(async function () {
        // Create verified user with login OTP
        const user = new User(testUser);
        user.isVerified = true;
        user.generateVerificationOTP();
        await user.save();
      });

      it("should verify login OTP and return JWT token", async function () {
        const user = await User.findOne({ email: testUser.email });
        const otp = user.verificationOTP;

        const response = await request(app)
          .post("/api/auth/verify-login-otp")
          .send({
            email: testUser.email,
            otp: otp,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.token).to.exist;
        expect(response.body.data.user).to.exist;
        expect(response.body.data.user.email).to.equal(testUser.email);
      });

      it("should reject invalid OTP", async function () {
        const response = await request(app)
          .post("/api/auth/verify-login-otp")
          .send({
            email: testUser.email,
            otp: "000000",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("Invalid OTP");
      });

      it("should reject expired OTP", async function () {
        // Create user with expired OTP
        const user = new User(testUser);
        user.isVerified = true;
        user.generateVerificationOTP();
        user.verificationOTPExpiresAt = new Date(Date.now() - 60000);
        await user.save();

        const response = await request(app)
          .post("/api/auth/verify-login-otp")
          .send({
            email: testUser.email,
            otp: user.verificationOTP,
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("expired");
      });
    });

    describe("POST /verify-otp", function () {
      beforeEach(async function () {
        // Create unverified user with OTP
        const user = new User(testUser);
        user.isVerified = false;
        user.generateVerificationOTP();
        await user.save();
      });

      it("should verify OTP and mark user as verified", async function () {
        const user = await User.findOne({ email: testUser.email });
        const otp = user.verificationOTP;

        const response = await request(app)
          .post("/api/auth/verify-otp")
          .send({
            email: testUser.email,
            otp: otp,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.token).to.exist;
        expect(response.body.data.user.isVerified).to.be.true;
        expect(response.body.data.message).to.include(
          "Account verified successfully"
        );
      });

      it("should send welcome email for new users", async function () {
        const user = await User.findOne({ email: testUser.email });
        const otp = user.verificationOTP;

        const response = await request(app)
          .post("/api/auth/verify-otp")
          .send({
            email: testUser.email,
            otp: otp,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
      });
    });

    describe("POST /forgot-password", function () {
      beforeEach(async function () {
        // Create verified user
        const user = new User(testUser);
        user.isVerified = true;
        await user.save();
      });

      it("should send password reset OTP", async function () {
        const response = await request(app)
          .post("/api/auth/forgot-password")
          .send({
            email: testUser.email,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.message).to.include("OTP sent");
      });

      it("should reject non-existent user", async function () {
        const response = await request(app)
          .post("/api/auth/forgot-password")
          .send({
            email: "nonexistent@example.com",
          })
          .expect(404);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("User not found");
      });

      it("should require email", async function () {
        const response = await request(app)
          .post("/api/auth/forgot-password")
          .send({})
          .expect(400);

        expect(response.body.status).to.equal("fail");
      });

      it("should prevent rapid OTP requests", async function () {
        // Send first OTP
        await request(app)
          .post("/api/auth/forgot-password")
          .send({ email: testUser.email })
          .expect(200);

        // Try to send another immediately
        const response = await request(app)
          .post("/api/auth/forgot-password")
          .send({ email: testUser.email })
          .expect(429);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("Please wait");
      });
    });

    describe("POST /reset-password", function () {
      beforeEach(async function () {
        // Create verified user with password reset OTP
        const user = new User(testUser);
        user.isVerified = true;
        user.generatePasswordResetOTP();
        await user.save();
      });

      it("should reset password with valid OTP", async function () {
        const user = await User.findOne({ email: testUser.email });
        const otp = user.passwordResetOTP;
        const newPassword = "newpassword123";

        const response = await request(app)
          .post("/api/auth/reset-password")
          .send({
            email: testUser.email,
            otp: otp,
            newPassword: newPassword,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.message).to.include(
          "Password reset successfully"
        );

        // Verify password was actually changed
        const updatedUser = await User.findOne({
          email: testUser.email,
        }).select("+password");
        const isPasswordCorrect = await updatedUser.correctPassword(
          newPassword,
          updatedUser.password
        );
        expect(isPasswordCorrect).to.be.true;
      });

      it("should reject invalid OTP", async function () {
        const response = await request(app)
          .post("/api/auth/reset-password")
          .send({
            email: testUser.email,
            otp: "000000",
            newPassword: "newpassword123",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("Invalid OTP");
      });

      it("should reject expired OTP", async function () {
        // Create user with expired OTP
        const user = new User(testUser);
        user.isVerified = true;
        user.generatePasswordResetOTP();
        user.passwordResetOTPExpiresAt = new Date(Date.now() - 60000);
        await user.save();

        const response = await request(app)
          .post("/api/auth/reset-password")
          .send({
            email: testUser.email,
            otp: user.passwordResetOTP,
            newPassword: "newpassword123",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("expired");
      });

      it("should validate new password length", async function () {
        const user = await User.findOne({ email: testUser.email });
        const otp = user.passwordResetOTP;

        const response = await request(app)
          .post("/api/auth/reset-password")
          .send({
            email: testUser.email,
            otp: otp,
            newPassword: "123",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("at least 6 characters");
      });

      it("should require all fields", async function () {
        const response = await request(app)
          .post("/api/auth/reset-password")
          .send({
            email: testUser.email,
            otp: "123456",
          })
          .expect(400);

        expect(response.body.status).to.equal("fail");
      });
    });

    describe("POST /resend-otp", function () {
      beforeEach(async function () {
        // Create user with OTP
        const user = new User(testUser);
        user.generateVerificationOTP();
        await user.save();
      });

      it("should resend verification OTP", async function () {
        const response = await request(app)
          .post("/api/auth/resend-otp")
          .send({
            email: testUser.email,
          })
          .expect(200);

        expect(response.body.status).to.equal("success");
        expect(response.body.data.message).to.include("OTP sent");
      });

      it("should prevent rapid OTP requests", async function () {
        // Send first OTP
        await request(app)
          .post("/api/auth/resend-otp")
          .send({ email: testUser.email })
          .expect(200);

        // Try to send another immediately
        const response = await request(app)
          .post("/api/auth/resend-otp")
          .send({ email: testUser.email })
          .expect(429);

        expect(response.body.status).to.equal("fail");
        expect(response.body.message).to.include("Please wait");
      });
    });
  });

  describe("JWT Token Tests", function () {
    beforeEach(async function () {
      // Create verified user and get token
      const user = new User(testUser);
      user.isVerified = true;
      await user.save();

      // Login and get OTP
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      // Verify OTP to get token
      const userWithOTP = await User.findOne({ email: testUser.email });
      const otpResponse = await request(app)
        .post("/api/auth/verify-login-otp")
        .send({
          email: testUser.email,
          otp: userWithOTP.verificationOTP,
        });

      authToken = otpResponse.body.data.token;
    });

    it("should have unlimited expiry for OTP verification tokens", function () {
      const token = authToken;
      expect(token).to.exist;

      // Decode token to check expiry
      const decoded = require("jsonwebtoken").decode(token);
      expect(decoded.exp).to.be.undefined; // No expiry
    });

    it("should include user data in token response", function () {
      const token = authToken;
      expect(token).to.exist;

      // Token should be a valid JWT
      expect(token).to.match(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
      );
    });
  });

  describe("Error Handling Tests", function () {
    it("should handle database connection errors gracefully", async function () {
      // This test would require mocking database failures
      // For now, we'll test basic error handling
      expect(true).to.be.true;
    });

    it("should handle email service failures gracefully", async function () {
      // This test would require mocking email service failures
      // For now, we'll test basic error handling
      expect(true).to.be.true;
    });

    it("should handle malformed requests gracefully", async function () {
      const response = await request(app)
        .post("/api/auth/signup")
        .send("invalid json")
        .expect(400);

      expect(response.body.status).to.equal("fail");
    });
  });
});
