const mongoose = require("mongoose");

const kycSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    documentType: {
      type: String,
      enum: ["Aadhar card", "PAN card", "Driving licence"],
      required: true,
    },

    frontImage: {
      url: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
    },

    backImage: {
      url: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
    },

    status: {
      type: String,
      enum: ["applied", "verified", "rejected"],
      default: "applied",
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    // Additional metadata
    submittedAt: {
      type: Date,
      default: Date.now,
    },

    // Document details (optional, can be extracted from images)
    documentNumber: {
      type: String,
      trim: true,
    },

    nameOnDocument: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
kycSchema.index({ status: 1 });
kycSchema.index({ documentType: 1 });

// Virtual for checking if KYC is pending review
kycSchema.virtual("isPendingReview").get(function () {
  return this.status === "applied";
});

// Virtual for checking if KYC is approved
kycSchema.virtual("isApproved").get(function () {
  return this.status === "verified";
});

// Virtual for checking if KYC is rejected
kycSchema.virtual("isRejected").get(function () {
  return this.status === "rejected";
});

// Method to approve KYC
kycSchema.methods.approve = function (reviewedBy) {
  this.status = "verified";
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.rejectionReason = undefined;
};

// Method to reject KYC
kycSchema.methods.reject = function (reviewedBy, reason) {
  this.status = "rejected";
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
};

// Ensure virtual fields are serialized
kycSchema.set("toJSON", { virtuals: true });
kycSchema.set("toObject", { virtuals: true });

const KYC = mongoose.model("KYC", kycSchema);

module.exports = KYC;
