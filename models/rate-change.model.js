const mongoose = require("mongoose");

const RateChangeSchema = new mongoose.Schema(
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
    oldRate: { type: Number, required: true },
    newRate: { type: Number, required: true },
    oldDuration: { type: Number, required: true },
    newDuration: { type: Number, required: true },
  },
  { timestamps: true }
);

const RateChange = mongoose.model("RateChange", RateChangeSchema);

module.exports = RateChange;
