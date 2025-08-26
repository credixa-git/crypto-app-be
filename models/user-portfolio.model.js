const mongoose = require("mongoose");

const UserPortfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
      unique: true,
    },

    principalAmount: { type: Number, required: true, default: 0 }, // current principal
    currentMonthlyRate: { type: Number, required: true, default: 0 }, // percent, e.g. 10 means 10%

    currentDurationDays: { type: Number, required: true, default: 0 }, // configured duration
    remainingDays: { type: Number, required: true, default: 0 }, // counts down nightly

    currentAccumulatedInterest: { type: Number, required: true, default: 0 }, // interest bucket
    totalEarnedInterest: { type: Number, required: true, default: 0 }, // all time interest earned

    lastInterestCreditDate: { type: Date }, // last midnight credit (server TZ)

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },
  },
  { timestamps: true }
);

const UserPortfolio = mongoose.model("UserPortfolio", UserPortfolioSchema);

module.exports = UserPortfolio;
