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
      trim: true,
    },
    screenshot: {
      key: {
        type: String,
      },
    },
    amount: {
      type: Number,
      required: true,
    },

    withdrawalType: {
      type: String,
      enum: ["principal", "interest"],
      required: function () {
        return this.type === "withdrawal";
      },
    },

    withdrawalAddress: {
      type: String,
      required: function () {
        return this.type === "withdrawal";
      },
    },

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

    rejectionReason: {
      type: String,
      required: function () {
        return this.status === "rejected";
      },
    },

    reviewedAt: { type: Date },
    adminNote: { type: String },
  },
  { timestamps: true }
);

// Ensure virtual fields are serialized
transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Transaction", transactionSchema);
