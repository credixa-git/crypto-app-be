const sinon = require("sinon");

class MockEmailService {
  constructor() {
    this.sentEmails = [];
    this.stubs = {};
  }

  // Mock sendOTPEmail method
  async sendOTPEmail(toEmail, otp, purpose) {
    const emailData = {
      to: toEmail,
      otp: otp,
      purpose: purpose,
      timestamp: new Date(),
      sent: true,
    };

    this.sentEmails.push(emailData);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      MessageId: `mock-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      emailData,
    };
  }

  // Mock sendWelcomeEmail method
  async sendWelcomeEmail(toEmail, userName) {
    const emailData = {
      to: toEmail,
      userName: userName,
      type: "welcome",
      timestamp: new Date(),
      sent: true,
    };

    this.sentEmails.push(emailData);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      MessageId: `mock-welcome-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      emailData,
    };
  }

  // Get all sent emails
  getSentEmails() {
    return this.sentEmails;
  }

  // Get emails by purpose
  getEmailsByPurpose(purpose) {
    return this.sentEmails.filter((email) => email.purpose === purpose);
  }

  // Get emails by recipient
  getEmailsByRecipient(email) {
    return this.sentEmails.filter((emailData) => emailData.to === email);
  }

  // Clear sent emails
  clearSentEmails() {
    this.sentEmails = [];
  }

  // Create stubs for testing
  createStubs() {
    this.stubs.sendOTPEmail = sinon
      .stub(this, "sendOTPEmail")
      .callsFake(this.sendOTPEmail.bind(this));
    this.stubs.sendWelcomeEmail = sinon
      .stub(this, "sendWelcomeEmail")
      .callsFake(this.sendWelcomeEmail.bind(this));
  }

  // Restore stubs
  restoreStubs() {
    Object.values(this.stubs).forEach((stub) => stub.restore());
    this.stubs = {};
  }

  // Mock AWS SES error
  async simulateError() {
    throw new Error("Mock AWS SES error");
  }
}

module.exports = MockEmailService;
