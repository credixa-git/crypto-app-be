function sendSuccessResponse(res, statusCode, data = {}) {
  const finalData = { status: "success", ...data };
  return res.status(statusCode).json(finalData);
}

module.exports = { sendSuccessResponse };
