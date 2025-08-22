const AppConfig = require("../config/appConfig");
const AppError = require("../utils/appError");

const handleCastErrorDB = (error) => {
  return new AppError(`Invalid ${error.path}: ${error.value}.`, 400);
};

const handleDuplicateFieldsDB = (error) => {
  const value = error.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  return new AppError(
    `Duplicate field value : ${value}. Please use another value`,
    400
  );
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((el) => el.message);
  return new AppError(`Invalid input data. ${errors.join(". ")}`, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token.Please log in again.", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please login again ", 401);

const sendErrorDev = (error, res) => {
  res.status(error.statusCode).json({
    status: error.status,
    error,
    message: error.message,
    stack: error.stack,
  });
};

const sendErrorProd = (error, res) => {
  // Operational , trusted error : send message to the client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });

    // Programming or other unknown error : don't leak error details
  } else {
    // 1) Log error
    console.error(error);

    // 2) Send generic message
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

module.exports = (error, _req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (AppConfig.env !== "production") {
    sendErrorDev(error, res);
  } else {
    if (error.name == "CastError") error = handleCastErrorDB(error);
    if (error.code == 11000) error = handleDuplicateFieldsDB(error);
    if (error.name == "ValidationError") error = handleValidationErrorDB(error);
    if (error.name == "JsonWebTokenError") error = handleJWTError();
    if (error.name == "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
