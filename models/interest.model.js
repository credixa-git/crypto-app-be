const mongoose = require("mongoose");

const InterestHistorySchema = new mongoose.Schema(
  {
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserPortfolio",
      index: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    principalAmount: { type: Number, required: true }, // principal at time of credit
    monthlyRate: { type: Number, required: true }, // percent
    dailyInterest: { type: Number, required: true }, // amount credited today
    date: { type: Date, required: true, index: true }, // the “day” this credit belongs to
  },
  { timestamps: true }
);

const InterestHistory = mongoose.model(
  "InterestHistory",
  InterestHistorySchema
);

module.exports = InterestHistory;
