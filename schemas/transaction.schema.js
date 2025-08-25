const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const createTransactionSchema = Joi.object({
  wallet: Joi.string().custom(objectId).required(),
  transactionHash: Joi.string().required(),
  amount: Joi.number().required(),
  type: Joi.string().valid("deposit", "withdrawal").required(),
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

module.exports = { createTransactionSchema, adminStatusVerification };
