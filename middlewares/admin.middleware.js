function adminProtection(req, res, next) {
  console.log("Skipping admin protection middleware");
  next();
}

module.exports = adminProtection;
