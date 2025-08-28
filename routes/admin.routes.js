const express = require("express");
const {
  getAllKYCSubmissions,
  getKYCSubmissionById,
  approveKYC,
  rejectKYC,
  getKYCStats,
  getAllUsers,
  getUserById,
  getUserStats,
} = require("../controllers/admin.controller");
const schemaValidator = require("../middlewares/schema.validator");
const adminProtection = require("../middlewares/admin.middleware");
const { rejectKYCSchema } = require("../schemas/admin.schema");
const {
  updateTransactionStatus,
  getAllTransactions,
  getTransactionById,
  getTransactionStats,
} = require("../controllers/transaction.controller");
const {
  adminStatusVerification,
  applyInterestSchema,
} = require("../schemas/transaction.schema");
const { createNotificationSchema } = require("../schemas/notification.schema");
const { applyInterest } = require("../controllers/interest.controller");
const {
  getNotifications,
  createNotification,
  deleteNotification,
} = require("../controllers/notification.controller");
const multer = require("multer");

// Configure multer for memory storage (QR images will be stored in memory before uploading to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const router = express.Router();

// TODO: Add admin role verification middleware here
router.use(adminProtection);

// KYC Management Routes
router.get("/kyc", getAllKYCSubmissions);
router.get("/kyc/stats", getKYCStats);
router.get("/kyc/:id", getKYCSubmissionById);
router.patch("/kyc/:id/approve", approveKYC);
router.patch("/kyc/:id/reject", schemaValidator(rejectKYCSchema), rejectKYC);

// User Management Routes
router.get("/users", getAllUsers);
router.get("/users/stats", getUserStats);
router.get("/users/:id", getUserById);

// Transaction Management Routes
router.get("/transactions", getAllTransactions);
router.get("/transactions/stats", getTransactionStats);
router.get("/transactions/:id", getTransactionById);
router.patch(
  "/transactions/:id",
  schemaValidator(adminStatusVerification),
  updateTransactionStatus
);

router.patch("/interest", schemaValidator(applyInterestSchema), applyInterest);

router.get("/notification", getNotifications);
router.post(
  "/notification",
  upload.single("image"),
  schemaValidator(createNotificationSchema),
  createNotification
);
router.delete("/notification/:id", deleteNotification);

module.exports = router;
