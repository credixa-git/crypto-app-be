const Joi = require("joi");

const createNotificationSchema = Joi.object({
  text: Joi.string().required(),
});

module.exports = {
  createNotificationSchema,
};
