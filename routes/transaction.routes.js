const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createDepositTransaction,
  createWithdrawTransaction,
  getTransactionHistory,
} = require("../controllers/transaction.controller");
const { getMyPortfolio } = require("../controllers/portfolio.controller");
const {
  createDepositTransactionSchema,
  createWithdrawTransactionSchema,
} = require("../schemas/transaction.schema");
const { protect } = require("../controllers/auth.controller");
const schemaValidator = require("../middlewares/schema.validator");

// Configure multer for memory storage (files will be stored in memory before uploading to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

router.use(protect);

router.get("/history", getTransactionHistory);

router.post(
  "/deposit",
  upload.single("screenshot"),
  schemaValidator(createDepositTransactionSchema),
  createDepositTransaction
);

router.post(
  "/withdraw",
  schemaValidator(createWithdrawTransactionSchema),
  createWithdrawTransaction
);

// User portfolio

router.get("/portfolio", getMyPortfolio);

module.exports = router;
