const colors = require("colors");
const express = require("express");
const AppConfig = require("./config/appConfig.js");
const globalErrorHandler = require("./controllers/error.controller.js");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const AppError = require("./utils/appError.js");
const cron = require("node-cron");
const creditInterest = require("./crons/interestCreditCron.js");
const ping = require("./crons/ping.js");

cron.schedule("*/5 * * * *", () => {
  console.log("Pinging to keep the server awake...");
  ping();
});

// 0 0 * * * = At 00:00 (midnight) every day
// */10 * * * * = Every 10 minutes
cron.schedule("0 0 * * *", () => {
  console.log("running a task every midnight to credit interest");
  creditInterest();
});

console.info("Server initialization started...".yellow);

const app = express();

// GLOBAL MIDDLEWARES
const options = {
  origin: "*",
};
// Add cross origin
app.use(cors(options));

// Development infoging
if (AppConfig.env !== "production") {
  app.use(morgan("dev"));
}

// Body parser, reading data from body into req.body
app.use(express.json());

// ROUTES
app.get("/", (_, res) => {
  res.json({ message: "Server started successfully", env: AppConfig.env });
});
app.use("/", require("./routes/auth.routes.js"));
app.use("/kyc", require("./routes/kyc.routes.js"));
app.use("/admin", require("./routes/admin.routes.js"));
app.use("/admin/wallets", require("./routes/adminWallet.routes.js"));
app.use("/wallets", require("./routes/publicWallet.routes.js"));
app.use("/transactions", require("./routes/transaction.routes.js"));

app.use((req, _, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error middleware
app.use(globalErrorHandler);

// Server initialization
async function initialize() {
  await mongoose.connect(AppConfig.database);
  console.info("DB connection successful".green.bold);

  const server = app.listen(AppConfig.port, (err) => {
    console.info(`Server listening on port ${AppConfig.port}`.blue.bold);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...".red);
    console.error(err.name, err.message);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION! 💥 Shutting down...".red);
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    console.error("👋 SIGTERM RECEIVED. Shutting down gracefully".yellow);
    server.close(() => {
      console.error("💥 Process terminated!".red);
    });
  });
}

initialize();
