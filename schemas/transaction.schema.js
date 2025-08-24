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

module.exports = { createTransactionSchema };
