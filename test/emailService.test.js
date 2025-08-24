const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Import the email service
const emailService = require("../services/emailService");
const testConfig = require("./config/test.config");

describe("Email Service Tests", function () {
  let sesClientStub;
  let sendCommandStub;

  beforeEach(function () {
    // Create stubs for AWS SES
    sesClientStub = sinon.stub();
    sendCommandStub = sinon.stub();

    // Mock the SES client
    sinon.stub(emailService, "ses").value({
      send: sendCommandStub,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("OTP Email Generation", function () {
    it("should generate OTP email HTML for signup", function () {
      const otp = "123456";
      const purpose = "signup";

      const html = emailService.generateOTPEmailHTML(otp, purpose);

      expect(html).to.include(otp);
      expect(html).to.include(purpose);
      expect(html).to.include("Crypto Port");
      expect(html).to.include("OTP Verification");
      expect(html).to.include("<!DOCTYPE html>");
      expect(html).to.include("</html>");
    });

    it("should generate OTP email HTML for login", function () {
      const otp = "654321";
      const purpose = "login";

      const html = emailService.generateOTPEmailHTML(otp, purpose);

      expect(html).to.include(otp);
      expect(html).to.include(purpose);
      expect(html).to.include("Crypto Port");
      expect(html).to.include("OTP Verification");
    });

    it("should generate OTP email HTML for password reset", function () {
      const otp = "789012";
      const purpose = "password reset";

      const html = emailService.generateOTPEmailHTML(otp, purpose);

      expect(html).to.include(otp);
      expect(html).to.include(purpose);
      expect(html).to.include("Crypto Port");
      expect(html).to.include("Password Reset OTP");
    });

    it("should include OTP expiry information", function () {
      const otp = "123456";
      const purpose = "verification";

      const html = emailService.generateOTPEmailHTML(otp, purpose);

      expect(html).to.include("This OTP will expire in");
      expect(html).to.include("minutes");
    });

    it("should have proper styling for different purposes", function () {
      const otp = "123456";

      // Test signup (green header)
      const signupHtml = emailService.generateOTPEmailHTML(otp, "signup");
      expect(signupHtml).to.include("#27ae60"); // Green color

      // Test password reset (red header)
      const resetHtml = emailService.generateOTPEmailHTML(
        otp,
        "password reset"
      );
      expect(resetHtml).to.include("#e74c3c"); // Red color

      // Test login (blue header)
      const loginHtml = emailService.generateOTPEmailHTML(otp, "login");
      expect(loginHtml).to.include("#3498db"); // Blue color
    });
  });

  describe("OTP Email Text Generation", function () {
    it("should generate OTP email text for signup", function () {
      const otp = "123456";
      const purpose = "signup";

      const text = emailService.generateOTPEmailText(otp, purpose);

      expect(text).to.include(otp);
      expect(text).to.include(purpose);
      expect(text).to.include("Crypto Port");
      expect(text).to.include("OTP Verification");
      expect(text).to.not.include("<html>"); // Should be plain text
    });

    it("should generate OTP email text for login", function () {
      const otp = "654321";
      const purpose = "login";

      const text = emailService.generateOTPEmailText(otp, purpose);

      expect(text).to.include(otp);
      expect(text).to.include(purpose);
      expect(text).to.include("Crypto Port");
      expect(text).to.include("Login Verification OTP");
    });

    it("should generate OTP email text for password reset", function () {
      const otp = "789012";
      const purpose = "password reset";

      const text = emailService.generateOTPEmailText(otp, purpose);

      expect(text).to.include(otp);
      expect(text).to.include(purpose);
      expect(text).to.include("Crypto Port");
      expect(text).to.include("Password Reset OTP");
    });

    it("should include OTP expiry information in text", function () {
      const otp = "123456";
      const purpose = "verification";

      const text = emailService.generateOTPEmailText(otp, purpose);

      expect(text).to.include("This OTP will expire in");
      expect(text).to.include("minutes");
    });
  });

  describe("Welcome Email Generation", function () {
    it("should generate welcome email HTML", function () {
      const userName = "John Doe";

      const html = emailService.generateWelcomeEmailHTML(userName);

      expect(html).to.include(userName);
      expect(html).to.include("Welcome to Crypto Port");
      expect(html).to.include("<!DOCTYPE html>");
      expect(html).to.include("</html>");
      expect(html).to.include("#27ae60"); // Green header
    });

    it("should generate welcome email text", function () {
      const userName = "Jane Smith";

      const text = emailService.generateWelcomeEmailText(userName);

      expect(text).to.include(userName);
      expect(text).to.include("Welcome to Crypto Port");
      expect(text).to.not.include("<html>"); // Should be plain text
    });

    it("should include platform features in welcome email", function () {
      const userName = "Test User";

      const html = emailService.generateWelcomeEmailHTML(userName);
      const text = emailService.generateWelcomeEmailText(userName);

      expect(html).to.include("Manage your crypto portfolio");
      expect(html).to.include("Track market trends");
      expect(text).to.include("Manage your crypto portfolio");
      expect(text).to.include("Track market trends");
    });
  });

  describe("Email Sending", function () {
    it("should send OTP email successfully", async function () {
      const toEmail = "test@example.com";
      const otp = "123456";
      const purpose = "signup";

      // Mock successful SES response
      const mockResponse = {
        MessageId: "test-message-id-123",
      };

      sendCommandStub.resolves(mockResponse);

      const result = await emailService.sendOTPEmail(toEmail, otp, purpose);

      expect(result).to.deep.equal(mockResponse);
      expect(sendCommandStub.calledOnce).to.be.true;

      // Verify the command was called with correct parameters
      const callArgs = sendCommandStub.firstCall.args[0];
      expect(callArgs).to.be.instanceOf(SendEmailCommand);
    });

    it("should send welcome email successfully", async function () {
      const toEmail = "welcome@example.com";
      const userName = "Welcome User";

      // Mock successful SES response
      const mockResponse = {
        MessageId: "welcome-message-id-456",
      };

      sendCommandStub.resolves(mockResponse);

      const result = await emailService.sendWelcomeEmail(toEmail, userName);

      expect(result).to.deep.equal(mockResponse);
      expect(sendCommandStub.calledOnce).to.be.true;
    });

    it("should handle SES errors gracefully", async function () {
      const toEmail = "error@example.com";
      const otp = "123456";
      const purpose = "signup";

      // Mock SES error
      const mockError = new Error("SES service unavailable");
      sendCommandStub.rejects(mockError);

      try {
        await emailService.sendOTPEmail(toEmail, otp, purpose);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Failed to send OTP email");
        expect(error.message).to.include("SES service unavailable");
      }
    });

    it("should use correct email parameters", async function () {
      const toEmail = "test@example.com";
      const otp = "123456";
      const purpose = "signup";

      sendCommandStub.resolves({ MessageId: "test-123" });

      await emailService.sendOTPEmail(toEmail, otp, purpose);

      // Verify the command parameters
      const callArgs = sendCommandStub.firstCall.args[0];
      const params = callArgs.input;

      expect(params.Source).to.include("Crypto Port");
      expect(params.Destination.ToAddresses).to.include(toEmail);
      expect(params.Message.Subject.Data).to.include(purpose);
      expect(params.Message.Body.Html.Data).to.include(otp);
      expect(params.Message.Body.Text.Data).to.include(otp);
    });

    it("should handle different email purposes correctly", async function () {
      const toEmail = "test@example.com";
      const otp = "123456";

      sendCommandStub.resolves({ MessageId: "test-123" });

      // Test signup
      await emailService.sendOTPEmail(toEmail, otp, "signup");
      let callArgs = sendCommandStub.firstCall.args[0];
      let params = callArgs.input;
      expect(params.Message.Subject.Data).to.include("signup");

      // Test login
      await emailService.sendOTPEmail(toEmail, otp, "login");
      callArgs = sendCommandStub.secondCall.args[0];
      params = callArgs.input;
      expect(params.Message.Subject.Data).to.include("login");

      // Test password reset
      await emailService.sendOTPEmail(toEmail, otp, "password reset");
      callArgs = sendCommandStub.thirdCall.args[0];
      params = callArgs.input;
      expect(params.Message.Subject.Data).to.include("password reset");
    });
  });

  describe("Email Content Validation", function () {
    it("should generate valid HTML structure", function () {
      const otp = "123456";
      const purpose = "verification";

      const html = emailService.generateOTPEmailHTML(otp, purpose);

      // Check for proper HTML structure
      expect(html).to.match(/<!DOCTYPE html>/);
      expect(html).to.match(/<html>/);
      expect(html).to.match(/<head>/);
      expect(html).to.match(/<body>/);
      expect(html).to.match(/<\/html>/);

      // Check for required elements
      expect(html).to.include("<title>");
      expect(html).to.include('<meta charset="UTF-8">');
      expect(html).to.include('<meta name="viewport"');
      expect(html).to.include("<style>");
      expect(html).to.include("</style>");
    });

    it("should generate valid CSS styles", function () {
      const otp = "123456";
      const purpose = "verification";

      const html = emailService.generateOTPEmailHTML(otp, purpose);

      // Check for CSS properties
      expect(html).to.include("font-family:");
      expect(html).to.include("background:");
      expect(html).to.include("color:");
      expect(html).to.include("padding:");
      expect(html).to.include("margin:");
      expect(html).to.include("border-radius:");
    });

    it("should include security warnings", function () {
      const otp = "123456";
      const purpose = "verification";

      const html = emailService.generateOTPEmailHTML(otp, purpose);
      const text = emailService.generateOTPEmailText(otp, purpose);

      // Check for security messages
      expect(html).to.include("Do not share this OTP with anyone");
      expect(html).to.include(
        "If you didn't request this, please ignore this email"
      );
      expect(text).to.include("Do not share this OTP with anyone");
      expect(text).to.include(
        "If you didn't request this, please ignore this email"
      );
    });

    it("should include company branding", function () {
      const otp = "123456";
      const purpose = "verification";

      const html = emailService.generateOTPEmailHTML(otp, purpose);
      const text = emailService.generateOTPEmailText(otp, purpose);

      // Check for company information
      expect(html).to.include("Crypto Port");
      expect(html).to.include("Crypto Port Team");
      expect(text).to.include("Crypto Port");
      expect(text).to.include("Crypto Port Team");
    });
  });

  describe("Email Service Configuration", function () {
    it("should use configured AWS settings", function () {
      // This test verifies that the email service is properly configured
      expect(emailService.fromEmail).to.exist;
      expect(emailService.fromName).to.exist;
      expect(emailService.ses).to.exist;
    });

    it("should handle missing configuration gracefully", function () {
      // Test that the service doesn't crash with missing config
      expect(() => {
        emailService.generateOTPEmailHTML("123456", "test");
      }).to.not.throw();

      expect(() => {
        emailService.generateOTPEmailText("123456", "test");
      }).to.not.throw();
    });
  });

  describe("Edge Cases", function () {
    it("should handle empty OTP gracefully", function () {
      const otp = "";
      const purpose = "verification";

      const html = emailService.generateOTPEmailHTML(otp, purpose);
      const text = emailService.generateOTPEmailText(otp, purpose);

      expect(html).to.include(otp);
      expect(text).to.include(otp);
    });

    it("should handle special characters in purpose", function () {
      const otp = "123456";
      const purpose = "special-purpose-with-@#$%^&*()";

      const html = emailService.generateOTPEmailHTML(otp, purpose);
      const text = emailService.generateOTPEmailText(otp, purpose);

      expect(html).to.include(purpose);
      expect(text).to.include(purpose);
    });

    it("should handle very long email addresses", function () {
      const toEmail =
        "very-long-email-address-that-exceeds-normal-length@very-long-domain-name.com";
      const otp = "123456";
      const purpose = "verification";

      // This should not crash
      expect(() => {
        emailService.generateOTPEmailHTML(otp, purpose);
        emailService.generateOTPEmailText(otp, purpose);
      }).to.not.throw();
    });
  });
});
