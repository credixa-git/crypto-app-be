const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
