const express = require("express");
const multer = require("multer");
const { protect } = require("../controllers/auth.controller");
const {
  submitKYC,
  getKYCStatus,
  resubmitKYC,
} = require("../controllers/kyc.controller");
const schemaValidator = require("../middlewares/schema.validator");
const { submitKYCSchema, resubmitKYCSchema } = require("../schemas/kyc.schema");

const router = express.Router();

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

// Apply protect middleware to all KYC routes
router.use(protect);

// Submit KYC documents
router.post(
  "/submit",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  schemaValidator(submitKYCSchema),
  submitKYC
);

// Get KYC status
router.get("/status", getKYCStatus);

// Resubmit KYC documents (if rejected)
router.post(
  "/resubmit",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  schemaValidator(resubmitKYCSchema),
  resubmitKYC
);

module.exports = router;
