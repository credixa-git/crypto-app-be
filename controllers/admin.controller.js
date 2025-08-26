const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendSuccessResponse } = require("../utils/apiResponse");
const KYC = require("../models/kyc.model");
const User = require("../models/user.model");
const s3Service = require("../services/s3.service");

/**
 * Get all KYC submissions with pagination and filtering
 * @route GET /api/admin/kyc
 * @access Private (Admin only)
 */
const getAllKYCSubmissions = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const documentType = req.query.documentType;

  const filter = {};
  if (status) filter.status = status;
  if (documentType) filter.documentType = documentType;

  const skip = (page - 1) * limit;

  const [kycSubmissions, total] = await Promise.all([
    KYC.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    KYC.countDocuments(filter),
  ]);

  // Generate presigned URLs for all images (valid for 1 hour)
  const kycSubmissionsWithUrls = await Promise.all(
    kycSubmissions.map(async (kyc) => {
      return await s3Service.generateKYCImageUrls(kyc, 3600);
    })
  );

  const totalPages = Math.ceil(total / limit);

  const responseData = {
    kycSubmissions: kycSubmissionsWithUrls,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
    },
  };

  return sendSuccessResponse(res, 200, responseData);
});

/**
 * Get KYC submission by ID
 * @route GET /api/admin/kyc/:id
 * @access Private (Admin only)
 */
const getKYCSubmissionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const kyc = await KYC.findById(id).populate("userId", "name email");

  if (!kyc) {
    return next(new AppError("KYC submission not found", 404));
  }

  // Generate presigned URLs for images (valid for 1 hour)
  const kycWithUrls = await s3Service.generateKYCImageUrls(kyc, 3600);

  return sendSuccessResponse(res, 200, { kyc: kycWithUrls });
});

/**
 * Approve KYC submission
 * @route PATCH /api/admin/kyc/:id/approve
 * @access Private (Admin only)
 */
const approveKYC = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const kyc = await KYC.findById(id);
  if (!kyc) {
    return next(new AppError("KYC submission not found", 404));
  }

  if (kyc.status !== "applied") {
    return next(
      new AppError("Only applied KYC submissions can be approved", 400)
    );
  }

  // Approve KYC
  kyc.approve(adminId);
  await kyc.save();

  // Update user KYC status
  await User.findByIdAndUpdate(kyc.userId, { kycStatus: "verified" });

  return sendSuccessResponse(res, 200, {
    message: "KYC approved successfully",
    kyc: {
      id: kyc._id,
      status: kyc.status,
      reviewedAt: kyc.reviewedAt,
    },
  });
});

/**
 * Reject KYC submission
 * @route PATCH /api/admin/kyc/:id/reject
 * @access Private (Admin only)
 */
const rejectKYC = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;

  if (!reason || reason.trim().length === 0) {
    return next(new AppError("Rejection reason is required", 400));
  }

  const kyc = await KYC.findById(id);
  if (!kyc) {
    return next(new AppError("KYC submission not found", 404));
  }

  if (kyc.status !== "applied") {
    return next(
      new AppError("Only applied KYC submissions can be rejected", 400)
    );
  }

  // Reject KYC
  kyc.reject(adminId, reason.trim());
  await kyc.save();

  // Update user KYC status
  await User.findByIdAndUpdate(kyc.userId, { kycStatus: "rejected" });

  return sendSuccessResponse(res, 200, {
    message: "KYC rejected successfully",
    kyc: {
      id: kyc._id,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason,
      reviewedAt: kyc.reviewedAt,
    },
  });
});

/**
 * Get all users with pagination and filtering
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
const getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search; // Search by name or email
  const kycStatus = req.query.kycStatus;
  const isVerified = req.query.isVerified;

  const filter = {};

  // Add search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Add KYC status filter
  if (kycStatus) {
    filter.kycStatus = kycStatus;
  }

  // Add verification status filter
  if (isVerified !== undefined) {
    filter.isVerified = isVerified === "true";
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "-password -verificationOTP -verificationOTPExpiresAt -passwordResetOTP -passwordResetOTPExpiresAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  // Get KYC status for each user
  const usersWithKYC = await Promise.all(
    users.map(async (user) => {
      const kyc = await KYC.findOne({ userId: user._id }).select(
        "status documentType submittedAt"
      );
      return {
        ...user.toObject(),
        kyc: kyc || null,
      };
    })
  );

  const totalPages = Math.ceil(total / limit);

  const responseData = {
    users: usersWithKYC,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
    },
  };

  return sendSuccessResponse(res, 200, responseData);
});

/**
 * Get user by ID with detailed information
 * @route GET /api/admin/users/:id
 * @access Private (Admin only)
 */
const getUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id).select(
    "-password -verificationOTP -verificationOTPExpiresAt -passwordResetOTP -passwordResetOTPExpiresAt"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Get KYC information
  const kyc = await KYC.findOne({ userId: user._id });

  // Get KYC images with presigned URLs if KYC exists
  let kycWithImages = null;
  if (kyc) {
    kycWithImages = await s3Service.generateKYCImageUrls(kyc, 3600);
  }

  const userData = {
    ...user.toObject(),
    kyc: kycWithImages,
  };

  return sendSuccessResponse(res, 200, { user: userData });
});

/**
 * Get user statistics
 * @route GET /api/admin/users/stats
 * @access Private (Admin only)
 */
const getUserStats = catchAsync(async (req, res, next) => {
  const [totalUsers, verifiedUsers, unverifiedUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ isVerified: false }),
  ]);

  const kycStatusStats = await User.aggregate([
    {
      $group: {
        _id: "$kycStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  // Convert to object format for easier access
  const kycStatusCounts = {};
  kycStatusStats.forEach((stat) => {
    kycStatusCounts[stat._id] = stat.count;
  });

  const responseData = {
    totalUsers,
    verifiedUsers,
    unverifiedUsers,
    kycStatusCounts: {
      "not applied": kycStatusCounts["not applied"] || 0,
      applied: kycStatusCounts["applied"] || 0,
      verified: kycStatusCounts["verified"] || 0,
      rejected: kycStatusCounts["rejected"] || 0,
    },
  };

  return sendSuccessResponse(res, 200, responseData);
});

/**
 * Get KYC statistics
 * @route GET /api/admin/kyc/stats
 * @access Private (Admin only)
 */
const getKYCStats = catchAsync(async (req, res, next) => {
  const [total, applied, verified, rejected] = await Promise.all([
    KYC.countDocuments(),
    KYC.countDocuments({ status: "applied" }),
    KYC.countDocuments({ status: "verified" }),
    KYC.countDocuments({ status: "rejected" }),
  ]);

  const documentTypeStats = await KYC.aggregate([
    {
      $group: {
        _id: "$documentType",
        count: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
        },
        applied: {
          $sum: { $cond: [{ $eq: ["$status", "applied"] }, 1, 0] },
        },
      },
    },
  ]);

  const responseData = {
    total,
    applied,
    verified,
    rejected,
    documentTypeStats,
  };

  return sendSuccessResponse(res, 200, responseData);
});

module.exports = {
  getAllKYCSubmissions,
  getKYCSubmissionById,
  approveKYC,
  rejectKYC,
  getKYCStats,
  getAllUsers,
  getUserById,
  getUserStats,
};
