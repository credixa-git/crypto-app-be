const Joi = require("joi");

const rejectKYCSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(500).required().messages({
    "string.empty": "Rejection reason cannot be empty",
    "string.min": "Rejection reason must be at least 10 characters long",
    "string.max": "Rejection reason cannot exceed 500 characters",
    "any.required": "Rejection reason is required",
  }),
});

module.exports = {
  rejectKYCSchema,
};
