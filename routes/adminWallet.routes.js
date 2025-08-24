const express = require("express");
const multer = require("multer");
const adminProtection = require("../middlewares/admin.middleware");
const {
  getAllWallets,
  getWalletById,
  createWallet,
  updateWallet,
  activateWallet,
  deactivateWallet,
  deleteWallet,
  getWalletStats,
} = require("../controllers/wallet.controller");
const schemaValidator = require("../middlewares/schema.validator");
const {
  createWalletSchema,
  updateWalletSchema,
} = require("../schemas/wallet.schema");

const router = express.Router();

// Configure multer for memory storage (QR images will be stored in memory before uploading to S3)
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

// Apply admin protection middleware to all routes
router.use(adminProtection);

// Wallet Management Routes
router.get("/", getAllWallets);
router.get("/stats", getWalletStats);
router.get("/:id", getWalletById);

// Create wallet (requires QR image upload)
router.post(
  "/",
  upload.single("qrImage"),
  schemaValidator(createWalletSchema),
  createWallet
);

// Update wallet (optional QR image upload)
router.patch(
  "/:id",
  upload.single("qrImage"),
  schemaValidator(updateWalletSchema),
  updateWallet
);

// Activate/Deactivate wallet
router.patch("/:id/activate", activateWallet);
router.patch("/:id/deactivate", deactivateWallet);

// Delete wallet (hard delete)
router.delete("/:id", deleteWallet);

module.exports = router;
