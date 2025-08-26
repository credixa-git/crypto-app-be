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

  monthlyRate: Joi.number().when("status", {
    is: "accepted",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  duration: Joi.number().when("status", {
    is: "accepted",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

module.exports = {
  createDepositTransactionSchema,
  createWithdrawTransactionSchema,
  adminStatusVerification,
};
