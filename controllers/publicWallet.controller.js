const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendSuccessResponse } = require("../utils/apiResponse");
const Wallet = require("../models/wallet.model");
const s3Service = require("../services/s3.service");

/**
 * Get all active wallets for public use
 * @route GET /api/wallets
 * @access Public
 */
const getActiveWallets = catchAsync(async (req, res, next) => {
  const chain = req.query.chain;
  const token = req.query.token;
  const limit = parseInt(req.query.limit) || 50;

  const filter = { isActive: true };

  // Add chain filter
  if (chain) {
    filter.chain = chain;
  }

  // Add token filter
  if (token) {
    filter.token = { $regex: token, $options: "i" };
  }

  const wallets = await Wallet.find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);

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
            url: qrUrl,
          },
        };
      } catch (error) {
        console.error(
          `Failed to generate QR URL for wallet ${wallet._id}:`,
          error
        );
        return {
          ...wallet.toObject(),
          qrImage: { url: null },
        };
      }
    })
  );

  return sendSuccessResponse(res, 200, { wallets: walletsWithQR });
});

/**
 * Get wallet by ID for public use
 * @route GET /api/wallets/:id
 * @access Public
 */
const getWalletById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const wallet = await Wallet.findById(id);

  if (!wallet) {
    return next(new AppError("Wallet not found", 404));
  }

  if (!wallet.isActive) {
    return next(new AppError("Wallet is not available", 404));
  }

  // Generate presigned URL for QR image
  try {
    const qrUrl = await s3Service.generatePresignedUrl(
      wallet.qrImage.key,
      3600
    );
    wallet.toObject().qrImage = { url: qrUrl };
  } catch (error) {
    console.error(`Failed to generate QR URL for wallet ${wallet._id}:`, error);
    wallet.qrImage = { url: null };
  }

  return sendSuccessResponse(res, 200, { wallet });
});

/**
 * Get available chains
 * @route GET /api/wallets/chains
 * @access Public
 */
const getAvailableChains = catchAsync(async (req, res, next) => {
  const chains = await Wallet.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$chain",
        count: { $sum: 1 },
        tokens: { $addToSet: "$token" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const responseData = chains.map((chain) => ({
    chain: chain._id,
    walletCount: chain.count,
    availableTokens: chain.tokens,
  }));

  return sendSuccessResponse(res, 200, { chains: responseData });
});

/**
 * Get available tokens
 * @route GET /api/wallets/tokens
 * @access Public
 */
const getAvailableTokens = catchAsync(async (req, res, next) => {
  const chain = req.query.chain;

  const filter = { isActive: true };
  if (chain) {
    filter.chain = chain;
  }

  const tokens = await Wallet.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$token",
        count: { $sum: 1 },
        chains: { $addToSet: "$chain" },
        averageNetworkFee: { $avg: "$networkFee" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const responseData = tokens.map((token) => ({
    token: token._id,
    walletCount: token.count,
    availableChains: token.chains,
    averageNetworkFee: token.averageNetworkFee || 0,
  }));

  return sendSuccessResponse(res, 200, { tokens: responseData });
});

/**
 * Search wallets
 * @route GET /api/wallets/search
 * @access Public
 */
const searchWallets = catchAsync(async (req, res, next) => {
  const { q, chain, token } = req.query;
  const limit = parseInt(req.query.limit) || 20;

  if (!q && !chain && !token) {
    return next(new AppError("Please provide search criteria", 400));
  }

  const filter = { isActive: true };

  // Add search query
  if (q) {
    filter.$or = [
      { walletAddress: { $regex: q, $options: "i" } },
      { token: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  // Add chain filter
  if (chain) {
    filter.chain = chain;
  }

  // Add token filter
  if (token) {
    filter.token = { $regex: token, $options: "i" };
  }

  const wallets = await Wallet.find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);

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
            url: qrUrl,
          },
        };
      } catch (error) {
        console.error(
          `Failed to generate QR URL for wallet ${wallet._id}:`,
          error
        );
        return {
          ...wallet.toObject(),
          qrImage: { url: null },
        };
      }
    })
  );

  return sendSuccessResponse(res, 200, {
    wallets: walletsWithQR,
    searchCriteria: { q, chain, token },
    totalResults: walletsWithQR.length,
  });
});

module.exports = {
  getActiveWallets,
  getWalletById,
  getAvailableChains,
  getAvailableTokens,
  searchWallets,
};
