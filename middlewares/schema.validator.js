const AppError = require("../utils/appError");

const schemaValidator = (schema) => {
  return (req, res, next) => {
    if (!schema) {
      return next(new AppError("Schema not passed correctly", 500));
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      // return first error message or all messages joined
      const message = error.details.map((d) => d.message).join(", ");
      return next(new AppError(message, 400));
    }

    req.body = value; // sanitized body
    next();
  };
};

module.exports = schemaValidator;
