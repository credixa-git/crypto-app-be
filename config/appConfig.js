require("dotenv").config();

const AppConfig = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) ?? 3000,
  database: process.env.DATABASE ?? "mongodb://localhost:27017/",

  jwt: {
    secret: process.env.JWT_SECRET ?? "supersecret",
    expiry: process.env.JWT_EXPIRES_IN ?? "30d",
    cookieExpiry: Number(process.env.JWT_COOKIE_EXPIRES_IN) ?? 30,
  },

  otp: {
    expiry: Number(process.env.OTP_EXPIRY_MINUTES) || 15, // 15 minutes in minutes
    length: Number(process.env.OTP_LENGTH) || 6,
  },

  aws: {
    region: process.env.AWS_REGION ?? "ap-south-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ses: {
      fromEmail: process.env.AWS_SES_FROM_EMAIL ?? "noreply@yourdomain.com",
      fromName: process.env.AWS_SES_FROM_NAME ?? "Crypto Port",
    },
  },
};

module.exports = AppConfig;
