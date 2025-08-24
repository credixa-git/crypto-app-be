const { protect } = require("../controllers/auth.controller");
const AppError = require("../utils/appError");

/**
 * Middleware to check if user has admin privileges
 * This is a basic implementation - you can enhance it based on your role system
 */
const requireAdmin = async (req, res, next) => {
  try {
    // First, ensure user is authenticated
    await new Promise((resolve, reject) => {
      protect(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Check if user has admin privileges
    // You can implement your own admin role logic here
    // For now, we'll check if the user's email contains 'admin' or if they have a specific role field

    if (!req.user) {
      return next(new AppError("User not found", 401));
    }

    // Example admin check - modify this based on your user model
    const isAdmin =
      req.user.email &&
      (req.user.email.includes("credixaapp") ||
        req.user.email.includes("@credixaapp") ||
        req.user.isAdmin === true ||
        req.user.role === "admin");

    if (!isAdmin) {
      return next(
        new AppError("Access denied. Admin privileges required.", 403)
      );
    }

    next();
  } catch (error) {
    return next(new AppError("Authentication failed", 401));
  }
};

module.exports = requireAdmin;
