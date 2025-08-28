const catchAsync = require("../utils/catchAsync");
const Notification = require("../models/notification.model");
const s3Service = require("../services/s3.service");
const { sendSuccessResponse } = require("../utils/apiResponse");

const getNotifications = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(),
  ]);

  const notificationsWithUrl = await Promise.all(
    notifications.map(async (notification) => {
      if (notification.image) {
        const url = await s3Service.generatePresignedUrl(
          notification.image,
          3600
        );
        return { ...notification.toObject(), imageUrl: url };
      }
      return notification.toObject();
    })
  );

  return sendSuccessResponse(res, 200, {
    total,
    notifications: notificationsWithUrl,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  });
});

const createNotification = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  const image = req.file;

  const { key } = image
    ? await s3Service.uploadFile(
        image.buffer,
        s3Service.generateFileKey(image.originalname, "notification", "image"),
        image.mimetype
      )
    : undefined;

  const newNotification = await Notification.create({ text, image: key });

  return sendSuccessResponse(res, 201, {
    message: "Notification created",
    newNotification,
  });
});

const deleteNotification = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  await notification.deleteOne();

  return sendSuccessResponse(res, 200, {
    message: "Notification deleted",
  });
});

module.exports = { getNotifications, createNotification, deleteNotification };
