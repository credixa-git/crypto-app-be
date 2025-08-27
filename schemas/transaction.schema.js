const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const createDepositTransactionSchema = Joi.object({
  wallet: Joi.string().custom(objectId).required(),
  transactionHash: Joi.string().required(),
  amount: Joi.number().required(),
});

const createWithdrawTransactionSchema = Joi.object({
  wallet: Joi.string().required(),
  amount: Joi.string().required(),
  withdrawalType: Joi.string().required().valid("principal", "interest"),
});

const adminStatusVerification = Joi.object({
  status: Joi.string().valid("accepted", "rejected").optional(),
});

const applyInterestSchema = Joi.object({
  userId: Joi.string().custom(objectId).required(),
  duration: Joi.number().min(0).optional(),
  interestRate: Joi.number().min(0).max(100).optional(),
});

module.exports = {
  createDepositTransactionSchema,
  createWithdrawTransactionSchema,
  adminStatusVerification,
  applyInterestSchema,
};
