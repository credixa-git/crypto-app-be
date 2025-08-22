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
};

module.exports = AppConfig;
