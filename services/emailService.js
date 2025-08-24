const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const AppConfig = require("../config/appConfig");

class EmailService {
  constructor() {
    if (EmailService.instance) {
      return EmailService.instance;
    }

    // Configure AWS SES client
    this.ses = new SESClient({
      region: AppConfig.aws.region,
      credentials: {
        accessKeyId: AppConfig.aws.accessKeyId,
        secretAccessKey: AppConfig.aws.secretAccessKey,
      },
    });

    this.fromEmail = AppConfig.aws.ses.fromEmail;
    this.fromName = AppConfig.aws.ses.fromName;

    EmailService.instance = this;
  }

  /**
   * Send OTP email to user
   * @param {string} toEmail - Recipient email
   * @param {string} otp - OTP code
   * @param {string} purpose - Purpose of OTP (signup/login)
   * @returns {Promise<Object>} - SES response
   */
  async sendOTPEmail(toEmail, otp, purpose = "verification") {
    const subject = `Your OTP for ${purpose} - Crypto Port`;
    const htmlBody = this.generateOTPEmailHTML(otp, purpose);
    const textBody = this.generateOTPEmailText(otp, purpose);

    const params = {
      Source: `${this.fromName} <${this.fromEmail}>`,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    };

    try {
      const command = new SendEmailCommand(params);
      const result = await this.ses.send(command);
      console.log(
        `OTP email sent successfully to ${toEmail}:`,
        result.MessageId
      );
      return result;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  /**
   * Generate HTML email body for OTP
   * @param {string} otp - OTP code
   * @param {string} purpose - Purpose of OTP
   * @returns {string} - HTML email body
   */
  generateOTPEmailHTML(otp, purpose) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .otp-box { background: #e74c3c; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #7f8c8d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Crypto Port</h1>
          </div>
          <div class="content">
            <h2>OTP Verification</h2>
            <p>Hello!</p>
            <p>Your OTP for ${purpose} is:</p>
            <div class="otp-box">${otp}</div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This OTP will expire in ${
                AppConfig.otp.expiry || 15
              } minutes</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            <p>Best regards,<br>Crypto Port Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email body for OTP
   * @param {string} otp - OTP code
   * @param {string} purpose - Purpose of OTP
   * @returns {string} - Plain text email body
   */
  generateOTPEmailText(otp, purpose) {
    return `
OTP Verification - Crypto Port

Hello!

Your OTP for ${purpose} is: ${otp}

Important:
- This OTP will expire in ${AppConfig.otp.expiry || 15} minutes
- Do not share this OTP with anyone
- If you didn't request this, please ignore this email

Best regards,
Crypto Port Team

This is an automated email. Please do not reply.
    `.trim();
  }

  /**
   * Send welcome email to verified user
   * @param {string} toEmail - Recipient email
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - SES response
   */
  async sendWelcomeEmail(toEmail, userName) {
    const subject = "Welcome to Crypto Port!";
    const htmlBody = this.generateWelcomeEmailHTML(userName);
    const textBody = this.generateWelcomeEmailText(userName);

    const params = {
      Source: `${this.fromName} <${this.fromEmail}>`,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: textBody,
            Charset: "UTF-8",
          },
        },
      },
    };

    try {
      const command = new SendEmailCommand(params);
      const result = await this.ses.send(command);
      console.log(
        `Welcome email sent successfully to ${toEmail}:`,
        result.MessageId
      );
      return result;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  /**
   * Generate HTML email body for welcome email
   * @param {string} userName - User's name
   * @returns {string} - HTML email body
   */
  generateWelcomeEmailHTML(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Crypto Port</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .footer { text-align: center; padding: 20px; color: #7f8c8d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Crypto Port!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to Crypto Port! Your account has been successfully verified.</p>
            <p>You can now:</p>
            <ul>
              <li>Access all features of the platform</li>
              <li>Manage your crypto portfolio</li>
              <li>Track market trends</li>
              <li>And much more!</li>
            </ul>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>Crypto Port Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email body for welcome email
   * @param {string} userName - User's name
   * @returns {string} - Plain text email body
   */
  generateWelcomeEmailText(userName) {
    return `
Welcome to Crypto Port!

Hello ${userName}!

Welcome to Crypto Port! Your account has been successfully verified.

You can now:
- Access all features of the platform
- Manage your crypto portfolio
- Track market trends
- And much more!

If you have any questions, feel free to contact our support team.

Best regards,
Crypto Port Team

This is an automated email. Please do not reply.
    `.trim();
  }
}

// Export singleton instance
module.exports = new EmailService();
