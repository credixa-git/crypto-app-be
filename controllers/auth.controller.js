const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const AppConfig = require("../config/appConfig");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const emailService = require("../services/emailService");
const User = require("../models/user.model");
const { sendSuccessResponse } = require("../utils/apiResponse");

/**
 * Generate JWT token with configured expiry time
 * @param {string} id - User ID
 * @returns {string} - JWT token
 */
const signToken = (id) => {
  return jwt.sign({ id }, AppConfig.jwt.secret, {
    expiresIn: AppConfig.jwt.expiry,
  });
};

/**
 * Generate JWT token with unlimited expiry (never expires)
 * @param {string} id - User ID
 * @returns {string} - JWT token
 */
const signUnlimitedToken = (id) => {
  return jwt.sign({ id }, AppConfig.jwt.secret, {
    // No expiresIn means the token never expires
  });
};

/**
 * Create and send JWT token to client with optional unlimited expiry
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {boolean} redirect - Whether to redirect (default: false)
 * @param {boolean} unlimited - Whether token should have unlimited expiry (default: false)
 * @param {string} message - Optional success message to include in response
 * @returns {Object} - Response with token and user data
 */
const createAndSendToken = (
  user,
  statusCode,
  res,
  redirect = false,
  unlimited = false,
  message = null
) => {
  const token = unlimited ? signUnlimitedToken(user._id) : signToken(user._id);

  const cookieOptions = {
    httpOnly: true,
  };

  // Set cookie expiry based on token type
  if (unlimited) {
    // For unlimited tokens, set cookie to expire in 10 years (practically unlimited)
    cookieOptions.expires = new Date(
      Date.now() + 10 * 365 * 24 * 60 * 60 * 1000
    );
  } else {
    // For regular tokens, use configured expiry
    cookieOptions.expires = new Date(
      Date.now() + AppConfig.jwt.cookieExpiry * 24 * 60 * 60 * 1000
    );
  }

  // for https only
  if (AppConfig.env === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // remove password from output
  user.password = undefined;

  const responseData = {
    token,
    user,
  };

  // Add message if provided
  if (message) {
    responseData.message = message;
  }

  return sendSuccessResponse(res, statusCode, responseData);
};

const signup = catchAsync(async (req, res, next) => {
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    const otp = existingUser.generateOTP();
    await emailService.sendOTPEmail(existingUser.email, otp, "signup");
    return sendSuccessResponse(res, 200, {
      message: "OTP sent to your email for verification",
    });
  }

  // Create user with OTP verification required
  const newUser = await User.create({
    ...req.body,
    isVerified: false, // User needs to verify OTP first
  });

  // Generate OTP and send email
  const otp = newUser.generateVerificationOTP();
  await newUser.save();

  try {
    await emailService.sendOTPEmail(newUser.email, otp, "signup");

    // Remove sensitive data from response
    newUser.password = undefined;
    newUser.verificationOTP = undefined;
    newUser.verificationOTPExpiresAt = undefined;

    return sendSuccessResponse(res, 201, {
      user: newUser,
      message:
        "User created successfully. Please check your email for OTP verification.",
    });
  } catch (error) {
    // If email fails, delete the user and return error
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError("Failed to send OTP email. Please try again.", 500)
    );
  }
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exists
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const isPasswordCorrect = await user.correctPassword(password, user.password);

  if (!isPasswordCorrect) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) Check if user is verified
  if (!user.isVerified) {
    // Generate new OTP and send email
    const otp = user.generateVerificationOTP();
    await user.save();

    try {
      await emailService.sendOTPEmail(user.email, otp, "login");

      return sendSuccessResponse(res, 200, {
        message: "Please verify your account with OTP sent to your email",
        requiresVerification: true,
      });
    } catch (error) {
      return next(
        new AppError("Failed to send OTP email. Please try again.", 500)
      );
    }
  }

  // 4) Generate login OTP for additional security
  const loginOTP = user.generateVerificationOTP();
  await user.save();

  try {
    await emailService.sendOTPEmail(user.email, loginOTP, "login");

    return sendSuccessResponse(res, 200, {
      message: "Please verify your login with OTP sent to your email",
      requiresOTP: true,
    });
  } catch (error) {
    return next(
      new AppError("Failed to send login OTP email. Please try again.", 500)
    );
  }

  // 4) if everything ok and user is verified, send token to client
  createAndSendToken(user, 200, res);
});

const verifyLoginOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Please provide email and OTP", 400));
  }

  // Find user with OTP fields selected
  const user = await User.findOne({ email }).select(
    "+verificationOTP +verificationOTPExpiresAt"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if OTP is expired
  if (user.isVerificationOTPExpired()) {
    return next(
      new AppError("OTP has expired. Please request a new one.", 400)
    );
  }

  // Verify OTP
  if (!user.verifyOTP(otp)) {
    return next(new AppError("Invalid OTP", 400));
  }

  // Save user with cleared OTP
  await user.save();

  // Remove sensitive data
  user.password = undefined;
  user.verificationOTP = undefined;
  user.verificationOTPExpiresAt = undefined;

  // Send token to client
  return createAndSendToken(user, 200, res);
});

const verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Please provide email and OTP", 400));
  }

  // Find user with OTP fields selected
  const user = await User.findOne({ email }).select(
    "+verificationOTP +verificationOTPExpiresAt"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if OTP is expired
  if (user.isVerificationOTPExpired()) {
    return next(
      new AppError("OTP has expired. Please request a new one.", 400)
    );
  }

  // Verify OTP
  if (!user.verifyOTP(otp)) {
    return next(new AppError("Invalid OTP", 400));
  }

  // Save user with updated verification status
  await user.save();

  // Send welcome email if this was a signup verification
  if (!user.passwordChangedAt) {
    try {
      await emailService.sendWelcomeEmail(user.email, user.name || "User");
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't fail the verification if welcome email fails
    }
  }

  // Remove sensitive data
  user.password = undefined;
  user.verificationOTP = undefined;
  user.verificationOTPExpiresAt = undefined;

  // Use createAndSendToken with unlimited expiry and success message
  return createAndSendToken(
    user,
    200,
    res,
    false,
    true,
    "Account verified successfully"
  );
});

const resendOTP = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide email", 400));
  }

  const user = await User.findOne({ email }).select(
    "+verificationOTP +verificationOTPExpiresAt"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if previous OTP is still valid (within 1 minute)
  if (
    user.verificationOTPExpiresAt &&
    user.verificationOTPExpiresAt > new Date(Date.now() - 60000)
  ) {
    return next(new AppError("Please wait before requesting a new OTP", 429));
  }

  // Generate new OTP
  const otp = user.generateVerificationOTP();
  await user.save();

  try {
    await emailService.sendOTPEmail(user.email, otp, "verification");

    return sendSuccessResponse(res, 200, {
      message: "OTP sent successfully",
    });
  } catch (error) {
    return next(
      new AppError("Failed to send OTP email. Please try again.", 500)
    );
  }
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide email", 400));
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if previous password reset OTP is still valid (within 1 minute)
  if (
    user.passwordResetOTPExpiresAt &&
    user.passwordResetOTPExpiresAt > new Date(Date.now() - 60000)
  ) {
    return next(new AppError("Please wait before requesting a new OTP", 429));
  }

  // Generate new OTP for password reset
  const otp = user.generatePasswordResetOTP();
  await user.save();

  try {
    await emailService.sendOTPEmail(user.email, otp, "password reset");

    return sendSuccessResponse(res, 200, {
      message: "OTP sent to your email for password reset",
    });
  } catch (error) {
    return next(
      new AppError("Failed to send OTP email. Please try again.", 500)
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return next(
      new AppError("Please provide email, OTP, and new password", 400)
    );
  }

  // Validate new password
  if (newPassword.length < 6) {
    return next(
      new AppError("Password must be at least 6 characters long", 400)
    );
  }

  // Find user with OTP fields selected
  const user = await User.findOne({ email }).select(
    "+passwordResetOTP +passwordResetOTPExpiresAt"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if OTP is expired
  if (user.isPasswordResetOTPExpired()) {
    return next(
      new AppError("OTP has expired. Please request a new one.", 400)
    );
  }

  // Verify OTP for password reset
  if (!user.verifyPasswordResetOTP(otp)) {
    return next(new AppError("Invalid OTP", 400));
  }

  // Update password
  user.password = newPassword;
  user.passwordChangedAt = Date.now();

  // Clear OTP fields
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpiresAt = undefined;

  // Save user with new password
  await user.save();

  // Remove sensitive data
  user.password = undefined;
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpiresAt = undefined;

  return sendSuccessResponse(res, 200, {
    message: "Password reset successfully",
  });
});

const protect = catchAsync(async (req, res, next) => {
  try {
    // 0) Skip auth if coming from API Auth
    if (req.apiKey) {
      return next();
    }

    // 1) Getting token and check if it exists
    let token = "";
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in. Please login to get access", 401)
      );
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, AppConfig.jwt.secret);

    // 3) Check if token is already expired
    if (decoded.exp * 1000 < Date.now()) {
      return next(new AppError("Token is expired. Please login again.", 401));
    }

    // 3) Check if user still exists
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
      return next(
        new AppError("The token belonging to this user no longer exists", 401)
      );
    }

    // 4) Check if user is verified
    if (!freshUser.isVerified) {
      return next(
        new AppError(
          "Please verify your account with OTP before accessing this resource",
          403
        )
      );
    }

    // 5) Check if user changed password after token was issued
    if (!freshUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password! Please login again.", 401)
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = freshUser;
    next();
  } catch (error) {
    return next(new AppError(error.message, 401));
  }
});

module.exports = {
  signup,
  login,
  verifyOTP,
  verifyLoginOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  protect,
};
