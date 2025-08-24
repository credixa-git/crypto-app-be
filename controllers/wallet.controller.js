const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendSuccessResponse } = require("../utils/apiResponse");
const Wallet = require("../models/wallet.model");
const s3Service = require("../services/s3Service");

/**
 * Get all wallets with pagination and filtering
 * @route GET /api/admin/wallets
 * @access Private (Admin only)
 */
const getAllWallets = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const chain = req.query.chain;
  const token = req.query.token;
  const isActive = req.query.isActive;
  const search = req.query.search;

  const filter = {};

  // Add chain filter
  if (chain) {
    filter.chain = chain;
  }

  // Add token filter
  if (token) {
    filter.token = { $regex: token, $options: "i" };
  }

  // Add active status filter
  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  // Add search filter
  if (search) {
    filter.$or = [
      { walletAddress: { $regex: search, $options: "i" } },
      { token: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [wallets, total] = await Promise.all([
    Wallet.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Wallet.countDocuments(filter),
  ]);

  // Generate presigned URLs for QR images
  const walletsWithQR = await Promise.all(
    wallets.map(async (wallet) => {
      try {
        const qrUrl = await s3Service.generatePresignedUrl(
          wallet.qrImage.key,
          3600
        );
        return {
          ...wallet.toObject(),
          qrImage: {
            ...wallet.qrImage,
            url: qrUrl,
          },
        };
      } catch (error) {
        console.error(
          `Failed to generate QR URL for wallet ${wallet._id}:`,
          error
        );
        return wallet.toObject();
      }
    })
  );

  const totalPages = Math.ceil(total / limit);

  const responseData = {
    wallets: walletsWithQR,
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
 * Get wallet by ID
 * @route GET /api/admin/wallets/:id
 * @access Private (Admin only)
 */
const getWalletById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const wallet = await Wallet.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!wallet) {
    return next(new AppError("Wallet not found", 404));
  }

  // Generate presigned URL for QR image
  try {
    const qrUrl = await s3Service.generatePresignedUrl(
      wallet.qrImage.key,
      3600
    );
    wallet.qrImage.url = qrUrl;
  } catch (error) {
    console.error(`Failed to generate QR URL for wallet ${wallet._id}:`, error);
  }

  return sendSuccessResponse(res, 200, { wallet });
});

/**
 * Create new wallet
 * @route POST /api/admin/wallets
 * @access Private (Admin only)
 */
const createWallet = catchAsync(async (req, res, next) => {
  const {
    walletAddress,
    chain,
    token,
    description,
    networkFee,
    minimumAmount,
    maximumAmount,
    tags,
    priority,
  } = req.body;

  const adminId = req.user._id;

  // Check if QR image is uploaded
  if (!req.file) {
    return next(new AppError("QR image is required", 400));
  }

  // Validate QR image
  const qrValidation = s3Service.validateFile(req.file);
  if (!qrValidation.valid) {
    return next(new AppError(`QR image: ${qrValidation.error}`, 400));
  }

  try {
    // Generate file key for QR image
    const qrImageKey = s3Service.generateFileKey(
      req.file.originalname,
      adminId,
      "wallet-qr",
      "qr"
    );

    // Upload QR image to S3
    const qrUploadResult = await s3Service.uploadFile(
      req.file.buffer,
      qrImageKey,
      req.file.mimetype
    );

    // Create wallet record
    const walletData = {
      walletAddress,
      chain,
      token,
      description,
      networkFee,
      minimumAmount,
      maximumAmount,
      tags,
      priority,
      createdBy: adminId,
      qrImage: {
        key: qrUploadResult.key,
      },
    };

    const wallet = await Wallet.create(walletData);

    // Generate presigned URL for response
    const qrUrl = await s3Service.generatePresignedUrl(
      qrUploadResult.key,
      3600
    );

    const responseData = {
      wallet: {
        ...wallet.toObject(),
        qrImage: {
          url: qrUrl,
          key: wallet.qrImage.key,
        },
      },
      message: "Wallet created successfully",
    };

    return sendSuccessResponse(res, 201, responseData);
  } catch (error) {
    console.log(error);
    return next(
      new AppError("Failed to create wallet. Please try again.", 500)
    );
  }
});

/**
 * Update wallet
 * @route PATCH /api/admin/wallets/:id
 * @access Private (Admin only)
 */
const updateWallet = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const wallet = await Wallet.findById(id);
  if (!wallet) {
    return next(new AppError("Wallet not found", 404));
  }

  // Update basic fields
  const updateFields = [
    "walletAddress",
    "chain",
    "token",
    "description",
    "networkFee",
    "minimumAmount",
    "maximumAmount",
    "tags",
    "priority",
  ];

  updateFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      wallet[field] = req.body[field];
    }
  });

  // Update QR image if provided
  if (req.file) {
    const qrValidation = s3Service.validateFile(req.file);
    if (!qrValidation.valid) {
      return next(new AppError(`QR image: ${qrValidation.error}`, 400));
    }

    try {
      // Delete old QR image from S3
      if (wallet.qrImage.key) {
        await s3Service.deleteFile(wallet.qrImage.key);
      }

      // Generate new file key and upload
      const qrImageKey = s3Service.generateFileKey(
        req.file.originalname,
        adminId,
        "wallet-qr",
        "qr"
      );

      const qrUploadResult = await s3Service.uploadFile(
        req.file.buffer,
        qrImageKey,
        req.file.mimetype
      );

      wallet.updateQR(qrUploadResult.key, adminId);
    } catch (error) {
      return next(
        new AppError("Failed to update QR image. Please try again.", 500)
      );
    }
  }

  wallet.updatedBy = adminId;
  await wallet.save();

  // Generate presigned URL for response
  try {
    const qrUrl = await s3Service.generatePresignedUrl(
      wallet.qrImage.key,
      3600
    );
    wallet.qrImage.url = qrUrl;
  } catch (error) {
    console.error(`Failed to generate QR URL for wallet ${wallet._id}:`, error);
  }

  const responseData = {
    wallet,
    message: "Wallet updated successfully",
  };

  return sendSuccessResponse(res, 200, responseData);
});

/**
 * Activate wallet
 * @route PATCH /api/admin/wallets/:id/activate
 * @access Private (Admin only)
 */
const activateWallet = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const wallet = await Wallet.findById(id);
  if (!wallet) {
    return next(new AppError("Wallet not found", 404));
  }

  if (wallet.isActive) {
    return next(new AppError("Wallet is already active", 400));
  }

  wallet.activate(adminId);
  await wallet.save();

  return sendSuccessResponse(res, 200, {
    message: "Wallet activated successfully",
    wallet: {
      id: wallet._id,
      isActive: wallet.isActive,
    },
  });
});

/**
 * Deactivate wallet
 * @route PATCH /api/admin/wallets/:id/deactivate
 * @access Private (Admin only)
 */
const deactivateWallet = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const wallet = await Wallet.findById(id);
  if (!wallet) {
    return next(new AppError("Wallet not found", 404));
  }

  if (!wallet.isActive) {
    return next(new AppError("Wallet is already deactivated", 400));
  }

  wallet.deactivate(adminId);
  await wallet.save();

  return sendSuccessResponse(res, 200, {
    message: "Wallet deactivated successfully",
    wallet: {
      id: wallet._id,
      isActive: wallet.isActive,
    },
  });
});

/**
 * Delete wallet (hard delete)
 * @route DELETE /api/admin/wallets/:id
 * @access Private (Admin only)
 */
const deleteWallet = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const wallet = await Wallet.findById(id);
  if (!wallet) {
    return next(new AppError("Wallet not found", 404));
  }

  try {
    // Delete QR image from S3
    if (wallet.qrImage.key) {
      await s3Service.deleteFile(wallet.qrImage.key);
    }

    // Delete wallet from database
    await Wallet.findByIdAndDelete(id);

    return sendSuccessResponse(res, 200, {
      message: "Wallet deleted successfully",
    });
  } catch (error) {
    return next(
      new AppError("Failed to delete wallet. Please try again.", 500)
    );
  }
});

/**
 * Get wallet statistics
 * @route GET /api/admin/wallets/stats
 * @access Private (Admin only)
 */
const getWalletStats = catchAsync(async (req, res, next) => {
  const [totalWallets, activeWallets, inactiveWallets] = await Promise.all([
    Wallet.countDocuments(),
    Wallet.countDocuments({ isActive: true }),
    Wallet.countDocuments({ isActive: false }),
  ]);

  const chainStats = await Wallet.aggregate([
    {
      $group: {
        _id: "$chain",
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        inactive: {
          $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
        },
      },
    },
  ]);

  const tokenStats = await Wallet.aggregate([
    {
      $group: {
        _id: "$token",
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        inactive: {
          $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
        },
      },
    },
  ]);

  const responseData = {
    totalWallets,
    activeWallets,
    inactiveWallets,
    chainStats,
    tokenStats,
  };

  return sendSuccessResponse(res, 200, responseData);
});

module.exports = {
  getAllWallets,
  getWalletById,
  createWallet,
  updateWallet,
  activateWallet,
  deactivateWallet,
  deleteWallet,
  getWalletStats,
};
