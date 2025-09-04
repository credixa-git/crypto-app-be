const mongoose = require("mongoose");

const walletSchema = mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },

    chain: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Ethereum",
        "Tron",
        "Binance Smart Chain",
        "Polygon",
        "Solana",
        "Bitcoin",
        "Arbitrum",
        "Optimism",
        "Avalanche",
      ],
    },

    token: {
      type: String,
      required: true,
      trim: true,
    },

    qrImage: {
      key: {
        type: String,
        required: true,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    networkFee: {
      type: Number,
      min: 0,
    },

    minimumAmount: {
      type: Number,
      min: 0,
    },

    maximumAmount: {
      type: Number,
      min: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Metadata
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    priority: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
walletSchema.index({ walletAddress: 1 });
walletSchema.index({ chain: 1 });
walletSchema.index({ token: 1 });
walletSchema.index({ isActive: 1 });
walletSchema.index({ priority: -1, createdAt: -1 });

// Virtual for checking if wallet is active
walletSchema.virtual("isWalletActive").get(function () {
  return this.isActive;
});

// Method to activate wallet
walletSchema.methods.activate = function (updatedBy) {
  this.isActive = true;
  this.updatedBy = updatedBy;
};

// Method to deactivate wallet
walletSchema.methods.deactivate = function (updatedBy) {
  this.isActive = false;
  this.updatedBy = updatedBy;
};

// Method to update QR image
walletSchema.methods.updateQR = function (qrKey, updatedBy) {
  this.qrImage.key = qrKey;
  this.updatedBy = updatedBy;
};

// Ensure virtual fields are serialized
walletSchema.set("toJSON", { virtuals: true });
walletSchema.set("toObject", { virtuals: true });

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
