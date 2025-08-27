const UserPortfolio = require("../models/user-portfolio.model");
const { sendSuccessResponse } = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");

const getMyPortfolio = catchAsync(async (req, res, next) => {
  const user = req.user;
  const portfolio = await UserPortfolio.findOne({ userId: user });
  if (!portfolio) {
    return res.status(404).json({
      status: "fail",
      message: "Portfolio not found for the user",
    });
  }

  sendSuccessResponse(res, 200, {
    portfolio,
    message: "User portfolio fetched successfully",
  });
});

module.exports = { getMyPortfolio };
