const express = require("express");
const {
  getActiveWallets,
  getWalletById,
  getAvailableChains,
  getAvailableTokens,
  searchWallets,
} = require("../controllers/publicWallet.controller");
const schemaValidator = require("../middlewares/schema.validator");
const { searchWalletSchema } = require("../schemas/wallet.schema");

const router = express.Router();

// Public Wallet Routes (no authentication required)
router.get("/", getActiveWallets);
router.get("/chains", getAvailableChains);
router.get("/tokens", getAvailableTokens);
router.get("/search", schemaValidator(searchWalletSchema), searchWallets);
router.get("/:id", getWalletById);

module.exports = router;
