const express = require("express");
const authController = require("../controllers/auth.controller");
const schemaValidator = require("../middlewares/schema.validator");
const {
  signupSchema,
  loginSchema,
  otpSchema,
  resetPasswordSchema,
} = require("../schemas/auth.schema");

const router = express.Router();

// Public routes
router.post("/signup", schemaValidator(signupSchema), authController.signup);
router.post("/login", schemaValidator(loginSchema), authController.login);
router.post(
  "/verify-otp",
  schemaValidator(otpSchema),
  authController.verifyOTP
);
router.post(
  "/verify-login-otp",
  schemaValidator(otpSchema),
  authController.verifyLoginOTP
);
router.post(
  "/resend-otp",
  schemaValidator(otpSchema),
  authController.resendOTP
);
router.post(
  "/forgot-password",
  schemaValidator(otpSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  schemaValidator(resetPasswordSchema),
  authController.resetPassword
);

// Protected routes
router.use(authController.protect);

module.exports = router;
