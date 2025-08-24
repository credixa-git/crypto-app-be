const crypto = require("crypto"); // built-in
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true,
    },

    password: {
      type: String,
      minlength: 8,
      select: false,
    },

    // Account verification OTP fields
    verificationOTP: {
      type: String,
      select: false,
    },
    verificationOTPExpiresAt: {
      type: Date,
      select: false,
    },

    // Password reset OTP fields
    passwordResetOTP: {
      type: String,
      select: false,
    },
    passwordResetOTPExpiresAt: {
      type: Date,
      select: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // Only run this function if password is modified
  if (!this.isModified("password")) return next();

  // Hash the password with a cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // subtracting 1 sec to counter the time between issuing jwt and document saving time
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // this.password is not available because this refers to current document and current document does not have password as it is false
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = async function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000, // milliseconds to seconds
      10 // base 10
    ); // change date object to timestamp (unix)

    // console.log(changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp;
  }
  // False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // adding miliseconds to date object

  return resetToken; // to send token into email and encrypted version to database and so becomes useless to change password and hence secured
};

/**
 * Generate and store OTP for account verification
 * @returns {string} - Generated OTP
 */
userSchema.methods.generateVerificationOTP = function () {
  const AppConfig = require("../config/appConfig");

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP and set expiry (default to 15 minutes if not configured)
  this.verificationOTP = otp;
  let expiryMinutes = AppConfig.otp.expiry || 15; // fallback to 15 minutes

  // Ensure expiryMinutes is a valid number and create the expiry date
  if (isNaN(expiryMinutes) || expiryMinutes <= 0) {
    expiryMinutes = 15; // fallback to 15 minutes if invalid
  }

  this.verificationOTPExpiresAt = new Date(
    Date.now() + expiryMinutes * 60 * 1000
  );

  // Validate that the date was created successfully
  if (isNaN(this.verificationOTPExpiresAt.getTime())) {
    throw new Error("Failed to create valid verification OTP expiry date");
  }

  return otp;
};

/**
 * Generate and store OTP for password reset
 * @returns {string} - Generated OTP
 */
userSchema.methods.generatePasswordResetOTP = function () {
  const AppConfig = require("../config/appConfig");

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP and set expiry (default to 15 minutes if not configured)
  this.passwordResetOTP = otp;
  let expiryMinutes = AppConfig.otp.expiry || 15; // fallback to 15 minutes

  // Ensure expiryMinutes is a valid number and create the expiry date
  if (isNaN(expiryMinutes) || expiryMinutes <= 0) {
    expiryMinutes = 15; // fallback to 15 minutes if invalid
  }

  this.passwordResetOTPExpiresAt = new Date(
    Date.now() + expiryMinutes * 60 * 1000
  );

  // Validate that the date was created successfully
  if (isNaN(this.passwordResetOTPExpiresAt.getTime())) {
    throw new Error("Failed to create valid password reset OTP expiry date");
  }

  return otp;
};

/**
 * Verify OTP provided by user
 * @param {string} providedOTP - OTP provided by user
 * @returns {boolean} - True if OTP is valid and not expired
 */
userSchema.methods.verifyOTP = function (providedOTP) {
  // Check if OTP exists and matches
  if (!this.verificationOTP || this.verificationOTP !== providedOTP) {
    return false;
  }

  // Check if OTP is expired
  if (this.verificationOTPExpiresAt < new Date()) {
    return false;
  }

  // Clear OTP after successful verification
  this.verificationOTP = undefined;
  this.verificationOTPExpiresAt = undefined;
  this.isVerified = true;

  return true;
};

/**
 * Verify OTP for password reset (doesn't change verification status)
 * @param {string} providedOTP - OTP provided by user
 * @returns {boolean} - True if OTP is valid and not expired
 */
userSchema.methods.verifyPasswordResetOTP = function (providedOTP) {
  // Check if OTP exists and matches
  if (!this.passwordResetOTP || this.passwordResetOTP !== providedOTP) {
    return false;
  }

  // Check if OTP is expired
  if (this.passwordResetOTPExpiresAt < new Date()) {
    return false;
  }

  // Clear OTP after successful verification (but don't change isVerified)
  this.passwordResetOTP = undefined;
  this.passwordResetOTPExpiresAt = undefined;

  return true;
};

/**
 * Check if verification OTP is expired
 * @returns {boolean} - True if OTP is expired
 */
userSchema.methods.isVerificationOTPExpired = function () {
  return (
    this.verificationOTPExpiresAt && this.verificationOTPExpiresAt < new Date()
  );
};

/**
 * Check if password reset OTP is expired
 * @returns {boolean} - True if OTP is expired
 */
userSchema.methods.isPasswordResetOTPExpired = function () {
  return (
    this.passwordResetOTPExpiresAt &&
    this.passwordResetOTPExpiresAt < new Date()
  );
};

const User = mongoose.model("User", userSchema);

module.exports = User;
