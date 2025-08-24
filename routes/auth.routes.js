const express = require("express");
const authController = require("../controllers/auth.controller");
const schemaValidator = require("../middlewares/schema.validator");
const {
  signupSchema,
  loginSchema,
  otpSchema,
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
  "/resend-otp",
  schemaValidator(otpSchema),
  authController.resendOTP
);

// Protected routes
router.use(authController.protect);

module.exports = router;
