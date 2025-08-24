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

    // OTP verification fields
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
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
 * Generate and store OTP for user verification
 * @returns {string} - Generated OTP
 */
userSchema.methods.generateOTP = function () {
  const AppConfig = require("../config/appConfig");

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP and set expiry (default to 15 minutes if not configured)
  this.otp = otp;
  let expiryMinutes = AppConfig.otp.expiry || 15; // fallback to 15 minutes

  // Ensure expiryMinutes is a valid number and create the expiry date
  if (isNaN(expiryMinutes) || expiryMinutes <= 0) {
    expiryMinutes = 15; // fallback to 15 minutes if invalid
  }

  this.otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Validate that the date was created successfully
  if (isNaN(this.otpExpiresAt.getTime())) {
    throw new Error("Failed to create valid OTP expiry date");
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
  if (!this.otp || this.otp !== providedOTP) {
    return false;
  }

  // Check if OTP is expired
  if (this.otpExpiresAt < new Date()) {
    return false;
  }

  // Clear OTP after successful verification
  this.otp = undefined;
  this.otpExpiresAt = undefined;
  this.isVerified = true;

  return true;
};

/**
 * Check if OTP is expired
 * @returns {boolean} - True if OTP is expired
 */
userSchema.methods.isOTPExpired = function () {
  return this.otpExpiresAt && this.otpExpiresAt < new Date();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
