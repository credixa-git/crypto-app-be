const { sendSuccessResponse } = require("../utils/apiResponse");
const RateChange = require("../models/rate-change.model");
const InterestHistory = require("../models/interest.model");
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

const getMyInterestHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [rateChanges, total] = await Promise.all([
    InterestHistory.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InterestHistory.countDocuments({ userId }),
  ]);

  return sendSuccessResponse(res, 200, {
    total,
    rateChanges,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  });
});

module.exports = {
  applyInterest,
  getMyInterestHistory,
};
