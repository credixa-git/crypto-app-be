const { sendSuccessResponse } = require("../utils/apiResponse");
const RateChange = require("../models/rate-change.model");
const catchAsync = require("../utils/catchAsync");
const UserPortfolio = require("../models/user-portfolio.model");
const AppError = require("../utils/appError");

const applyInterest = catchAsync(async (req, res, next) => {
  const userId = req.body.userId;
  const duration = req.body.duration ?? 0;
  const interestRate = req.body.interestRate ?? 0;

  const userPort = await UserPortfolio.findOne({ userId });

  if (!userPort) return next(new AppError("User portfolio not found", 404));

  const prevRate = await RateChange.findOne({ userId }).sort({ createdAt: -1 });

  userPort.currentMonthlyRate = interestRate;
  userPort.currentDurationDays = duration;
  userPort.remainingDays = duration;

  await userPort.save();

  const newRateChange = await RateChange.create({
    userId,
    portfolioId: userPort._id,
    oldRate: prevRate ? prevRate.newRate : 0,
    newRate: interestRate,
    oldDuration: prevRate ? prevRate.newDuration : 0,
    newDuration: duration,
  });

  return sendSuccessResponse(res, 200, {
    message: "User interest updated",
    newRateChange,
  });
});

module.exports = {
  applyInterest,
};
