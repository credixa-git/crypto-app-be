const Joi = require("joi");

const createWalletSchema = Joi.object({
  walletAddress: Joi.string().trim().min(26).max(100).required().messages({
    "string.empty": "Wallet address cannot be empty",
    "string.min": "Wallet address must be at least 26 characters long",
    "string.max": "Wallet address cannot exceed 100 characters",
    "any.required": "Wallet address is required",
  }),

  chain: Joi.string()
    .valid(
      "Ethereum",
      "Binance Smart Chain",
      "Polygon",
      "Solana",
      "Bitcoin",
      "Arbitrum",
      "Optimism",
      "Avalanche"
    )
    .required()
    .messages({
      "any.only": "Chain must be one of the supported chains",
      "any.required": "Chain is required",
    }),

  token: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "Token cannot be empty",
    "string.min": "Token must be at least 1 character long",
    "string.max": "Token cannot exceed 50 characters",
    "any.required": "Token is required",
  }),

  description: Joi.string().trim().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),

  networkFee: Joi.number().min(0).optional().messages({
    "number.min": "Network fee cannot be negative",
  }),

  minimumAmount: Joi.number().min(0).optional().messages({
    "number.min": "Minimum amount cannot be negative",
  }),

  maximumAmount: Joi.number().min(0).optional().messages({
    "number.min": "Maximum amount cannot be negative",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(20))
    .max(10)
    .optional()
    .messages({
      "array.max": "Cannot have more than 10 tags",
      "string.max": "Each tag cannot exceed 20 characters",
    }),

  priority: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .default(0)
    .messages({
      "number.integer": "Priority must be an integer",
      "number.min": "Priority cannot be negative",
      "number.max": "Priority cannot exceed 100",
    }),
});

const updateWalletSchema = Joi.object({
  walletAddress: Joi.string().trim().min(26).max(100).optional().messages({
    "string.empty": "Wallet address cannot be empty",
    "string.min": "Wallet address must be at least 26 characters long",
    "string.max": "Wallet address cannot exceed 100 characters",
  }),

  chain: Joi.string()
    .valid(
      "Ethereum",
      "Binance Smart Chain",
      "Polygon",
      "Solana",
      "Bitcoin",
      "Arbitrum",
      "Optimism",
      "Avalanche"
    )
    .optional()
    .messages({
      "any.only": "Chain must be one of the supported chains",
    }),

  token: Joi.string().trim().min(1).max(50).optional().messages({
    "string.empty": "Token cannot be empty",
    "string.min": "Token must be at least 1 character long",
    "string.max": "Token cannot exceed 50 characters",
  }),

  description: Joi.string().trim().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),

  networkFee: Joi.number().min(0).optional().messages({
    "number.min": "Network fee cannot be negative",
  }),

  minimumAmount: Joi.number().min(0).optional().messages({
    "number.min": "Minimum amount cannot be negative",
  }),

  maximumAmount: Joi.number().min(0).optional().messages({
    "number.min": "Maximum amount cannot be negative",
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(20))
    .max(10)
    .optional()
    .messages({
      "array.max": "Cannot have more than 10 tags",
      "string.max": "Each tag cannot exceed 20 characters",
    }),

  priority: Joi.number().integer().min(0).max(100).optional().messages({
    "number.integer": "Priority must be an integer",
    "number.min": "Priority cannot be negative",
    "number.max": "Priority cannot exceed 100",
  }),
});

const searchWalletSchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).optional().messages({
    "string.min": "Search query must be at least 1 character long",
    "string.max": "Search query cannot exceed 100 characters",
  }),

  chain: Joi.string()
    .valid(
      "Ethereum",
      "Binance Smart Chain",
      "Polygon",
      "Solana",
      "Bitcoin",
      "Arbitrum",
      "Optimism",
      "Avalanche"
    )
    .optional()
    .messages({
      "any.only": "Chain must be one of the supported chains",
    }),

  token: Joi.string().trim().min(1).max(50).optional().messages({
    "string.min": "Token must be at least 1 character long",
    "string.max": "Token cannot exceed 50 characters",
  }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
});

module.exports = {
  createWalletSchema,
  updateWalletSchema,
  searchWalletSchema,
};
