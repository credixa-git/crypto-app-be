const mongoose = require("mongoose");
const UserPortfolio = require("../models/user-portfolio.model");
const InterestHistory = require("../models/interest.model");
const AppConfig = require("../config/appConfig");

const creditInterest = async () => {
  console.log("Starting interest credit process...".bgBlue);

  console.log("Setting up DB connection...".blue);
  await mongoose.connect(AppConfig.database);
  console.log("DB connection successful".green.bold);

  const userPortfolios = await UserPortfolio.find({
    remainingDays: { $gt: 0 },
  });

  for (const userPortfolio of userPortfolios) {
    userPortfolio.remainingDays -= 1;

    // Calculate daily interest (keep as number, not string!)
    const todayInterest =
      (userPortfolio.principalAmount *
        (userPortfolio.currentMonthlyRate / 100)) /
      30;

    // Add to accumulated and total earned interest safely
    userPortfolio.currentAccumulatedInterest =
      (userPortfolio.currentAccumulatedInterest || 0) + todayInterest;

    userPortfolio.totalEarnedInterest =
      (userPortfolio.totalEarnedInterest || 0) + todayInterest;

    await userPortfolio.save();

    await InterestHistory.create({
      principalAmount: userPortfolio.principalAmount,
      monthlyRate: userPortfolio.currentMonthlyRate,
      dailyInterest: todayInterest,
      date: new Date(),
    });
  }

  console.log("Interest credit process completed.".bgGreen);
};

module.exports = creditInterest;
