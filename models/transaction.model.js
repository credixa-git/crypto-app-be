const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    transactionHash: {
      type: String,
      required: true,
      trim: true,
    },
    screenshot: {
      key: {
        type: String,
        required: true,
      },
    },
    amount: {
      type: Number,
      required: true,
    },
    monthlyRate: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // number of days
      default: 0,
    },

    totalInterestEarned: { type: Number },
    adminConfirmationDate: { type: Date },
    historicalInterestRates: [{ rate: { type: Number }, date: { type: Date } }],
    historicalDuration: [{ duration: { type: Number }, date: { type: Date } }],

    historicalInterestEarned: [
      {
        earned: { type: Number },
        rateAt: { type: Number },
        date: { type: Date },
      },
    ],
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Ensure virtual fields are serialized
transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Transaction", transactionSchema);
