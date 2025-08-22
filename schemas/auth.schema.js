const Joi = require("joi");

const signupSchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "Name is required",
    "string.empty": "Name cannot be empty",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
  }),
})
  .required()
  .messages({
    "any.required": "Please provide a valid body",
    "object.base": "Body must be a valid JSON object",
  });

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  }),
})
  .required()
  .messages({
    "any.required": "Request body cannot be empty",
    "object.base": "Request body must be a valid JSON object",
  });

module.exports = {
  signupSchema,
  loginSchema,
};
