const Joi = require("joi");

const submitKYCSchema = Joi.object({
  documentType: Joi.string()
    .valid("Aadhar card", "PAN card", "Driving licence")
    .required()
    .messages({
      "any.required": "Document type is required",
      "any.only":
        "Document type must be one of: Aadhar card, PAN card, Driving licence",
    }),
});

const resubmitKYCSchema = Joi.object({
  documentType: Joi.string()
    .valid("Aadhar card", "PAN card", "Driving licence")
    .required()
    .messages({
      "any.required": "Document type is required",
      "any.only":
        "Document type must be one of: Aadhar card, PAN card, Driving licence",
    }),
});

module.exports = {
  submitKYCSchema,
  resubmitKYCSchema,
};
