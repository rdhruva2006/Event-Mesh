const { body, validationResult } = require("express-validator");

const registerRules = [
  body("name").trim().isLength({ min: 2, max: 80 }).withMessage("name must be 2-80 characters"),
  body("email").isEmail().withMessage("a valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters")
    .matches(/\d/)
    .withMessage("password must contain at least one number"),
];

const loginRules = [
  body("email").isEmail().withMessage("a valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("password is required"),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }
  next();
}

module.exports = { registerRules, loginRules, handleValidation };
