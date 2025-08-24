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
} = require("../controllers/transaction.controller");

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
router.get("/transactions/:id", getTransactionById);
router.patch("/transactions/:id/status", updateTransactionStatus);

module.exports = router;
