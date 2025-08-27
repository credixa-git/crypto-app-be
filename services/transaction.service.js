const UserPortfolio = require("../models/user-portfolio.model");

const creditPrincipalAmount = async (userId, creditAmount) => {
  const userPortfolio = await UserPortfolio.findOne({ userId: userId });
  if (!userPortfolio) throw new Error("User's portfolio not found");

  userPortfolio.principalAmount += creditAmount;
  await userPortfolio.save();
};

const withdrawPrincipalAmount = async (userId, withdrawAmount) => {
  const userPortfolio = await UserPortfolio.findOne({ userId: userId });
  if (!userPortfolio) throw new Error("User's portfolio not found");

  if (userPortfolio.principalAmount < withdrawAmount) {
    throw new Error("Insufficient principal amount");
  }

  userPortfolio.principalAmount -= withdrawAmount;
  await userPortfolio.save();
};

const withdrawInterestAmount = async (userId, withdrawAmount) => {
  const userPortfolio = await UserPortfolio.findOne({ userId: userId });
  if (!userPortfolio) throw new Error("User's portfolio not found");

  if (userPortfolio.currentAccumulatedInterest < withdrawAmount)
    throw new Error("Insufficient interest amount");

  userPortfolio.currentAccumulatedInterest -= withdrawAmount;
  await userPortfolio.save();
};

module.exports = {
  creditPrincipalAmount,
  withdrawPrincipalAmount,
  withdrawInterestAmount,
};
