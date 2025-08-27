const s3Service = require("../services/s3.service");

const Transaction = require("../models/transaction.model");
const transactionService = require("../services/transaction.service");

const Wallet = require("../models/wallet.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendSuccessResponse } = require("../utils/apiResponse");
const UserPortfolio = require("../models/user-portfolio.model");

const getTransactionHistory = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return sendSuccessResponse(res, 200, {
    total,
    transactions,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  });
});

const createDepositTransaction = catchAsync(async (req, res, next) => {
  const { wallet, transactionHash, amount } = req.body;
  const user = req.user._id;
  const screenshot = req.file;

  if (!screenshot) return next(new AppError("Screenshot is required", 400));

  // Validate wallet exists
  const selectedWallet = await Wallet.findOne({
    _id: wallet,
    isActive: true,
  });

  if (!selectedWallet) {
    return next(new AppError("No Supported wallet found", 400));
  }

  // Validate amount
  if (
    !(
      selectedWallet.minimumAmount === 0 && selectedWallet.maximumAmount == 0
    ) &&
    (amount < selectedWallet.minimumAmount ||
      amount > selectedWallet.maximumAmount)
  ) {
    return next(
      new AppError(
        `Amount must be between ${selectedWallet.minimumAmount} and ${selectedWallet.maximumAmount}`,
        400
      )
    );
  }

  const key = s3Service.generateFileKey(
    screenshot.originalname,
    "transaction",
    `${user}/${transactionHash}`
  );

  await s3Service.uploadFile(screenshot.buffer, key, screenshot.mimetype);

  const transaction = await Transaction.create({
    userId: user,
    wallet,
    transactionHash,
    screenshot: { key },
    amount,
    type: "deposit",
    status: "pending",
  });

  return sendSuccessResponse(res, 201, {
    message: "Deposit transaction created",
    transaction,
  });
});

const createWithdrawTransaction = catchAsync(async (req, res, next) => {
  const { wallet, withdrawalType, amount, withdrawalAddress } = req.body;
  const user = req.user._id;

  // Validate wallet exists
  const selectedWallet = await Wallet.findOne({
    _id: wallet,
    isActive: true,
  });

  if (!selectedWallet) {
    return next(new AppError("No Supported wallet found", 400));
  }

  // Validate amount
  const userPortfolio = await UserPortfolio.findOne({ userId: user });
  if (!userPortfolio) {
    return next(new AppError("User portfolio not found", 400));
  }

  if (withdrawalType === "principal") {
    if (amount > userPortfolio.principalAmount) {
      return next(new AppError("Insufficient principal amount", 400));
    }
  } else if (withdrawalType === "interest") {
    if (amount > userPortfolio.interestAmount) {
      return next(new AppError("Insufficient interest amount", 400));
    }
  } else {
    return next(new AppError("Invalid withdrawal type", 400));
  }

  const transaction = await Transaction.create({
    userId: user,
    wallet,
    amount,
    withdrawalType,
    withdrawalAddress,
    type: "withdrawal",
    status: "pending",
  });

  return sendSuccessResponse(res, 201, {
    message: "Withdrawal transaction created",
    transaction,
  });
});

const getAllTransactions = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  const transactionUrls = await Promise.all(
    transactions.map(async (transaction) => {
      if (transaction.screenshot?.key) {
        return await s3Service.generatePresignedUrl(
          transaction.screenshot.key,
          3600
        );
      }
      return null;
    })
  );

  const updatedTransactions = transactions.map((transaction, index) => {
    return {
      ...(transaction.toObject?.() ?? transaction),
      screenshot: transaction.screenshot?.key
        ? { url: transactionUrls[index] }
        : null,
    };
  });

  const totalPages = Math.ceil(total / limit);

  const responseData = {
    transactions: updatedTransactions,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
    },
  };
  sendSuccessResponse(res, 200, responseData);
});

const getTransactionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new AppError("Provide a valid id of transaction"));

  const transaction = await Transaction.findById(id);

  if (!transaction) return next(new AppError("Transaction not found", 400));

  if (!transaction.screenshot.key)
    return sendSuccessResponse(res, 200, {
      transaction: transaction.toObject(),
      message: "Transaction fetched",
    });

  const url = await s3Service.generatePresignedUrl(
    transaction.screenshot.key,
    3600
  );

  const transactionWithUrl = {
    ...transaction.toObject(),
    screenshot: {
      url,
    },
  };

  sendSuccessResponse(res, 200, {
    transaction: transactionWithUrl,
    message: "Transaction fetched",
  });
});

const updateTransactionStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const transaction = await Transaction.findById(id);

  if (!transaction) return next(new AppError("Transaction not found", 400));

  const { status } = req.body;

  if (transaction.status !== "pending") {
    return next(new AppError("Only pending transactions can be updated", 400));
  }

  if (status === "rejected") {
    // If rejected, simply update the status
    transaction.status = "rejected";
    await transaction.save();
    return sendSuccessResponse(res, 200, {
      message: "Transaction rejected",
      transaction,
    });
  }

  switch (transaction.type) {
    case "deposit":
      await transactionService.creditPrincipalAmount(
        transaction.userId,
        transaction.amount
      );
      break;
    case "withdrawal":
      // For withdrawal, mark as accepted
      if (transaction.withdrawalType === "principal") {
        await transactionService.withdrawPrincipalAmount(
          transaction.userId,
          transaction.amount
        );
      } else if (transaction.withdrawalType === "interest") {
        await transactionService.withdrawInterestAmount(
          transaction.userId,
          transaction.amount
        );
      } else {
        return next(new AppError("Invalid withdrawal type", 400));
      }
      break;
    default:
      return next(new AppError("Invalid transaction type", 400));
  }

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  return sendSuccessResponse(res, 200, {
    message: `Transaction updated`,
    updatedTransaction,
  });
});

module.exports = {
  getTransactionHistory,
  createDepositTransaction,
  createWithdrawTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransactionStatus,
};
