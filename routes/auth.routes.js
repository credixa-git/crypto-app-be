const express = require("express");
const router = express.Router();

const schemaValidator = require("../middlewares/schema.validator");
const { signupSchema, loginSchema } = require("../schemas/auth.schema");
const { signup, login } = require("../controllers/auth.controller");

router.post("/signup", schemaValidator(signupSchema), signup);
router.post("/login", schemaValidator(loginSchema), login);

module.exports = router;
