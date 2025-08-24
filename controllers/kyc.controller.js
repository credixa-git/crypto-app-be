const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendSuccessResponse } = require("../utils/apiResponse");
const KYC = require("../models/kyc.model");
const User = require("../models/user.model");
const s3Service = require("../services/s3Service");

/**
 * Submit KYC documents for verification
 * @route POST /api/kyc/submit
 * @access Private
 */
const submitKYC = catchAsync(async (req, res, next) => {
  const { documentType } = req.body;
  const userId = req.user._id;

  // Validate document type
  const validDocumentTypes = ["Aadhar card", "PAN card", "Driving licence"];
  if (!validDocumentTypes.includes(documentType)) {
    return next(
      new AppError(
        "Invalid document type. Must be one of: Aadhar card, PAN card, Driving licence",
        400
      )
    );
  }

  // Check if user already has a KYC submission
  const existingKYC = await KYC.findOne({ userId });
  if (existingKYC) {
    return next(
      new AppError(
        "KYC already submitted. Please wait for review or contact support if rejected.",
        400
      )
    );
  }

  // Check if files are uploaded
  if (!req.files || !req.files.frontImage || !req.files.backImage) {
    return next(new AppError("Both front and back images are required", 400));
  }

  const frontImage = req.files.frontImage[0];
  const backImage = req.files.backImage[0];

  // Validate files
  const frontValidation = s3Service.validateFile(frontImage);
  const backValidation = s3Service.validateFile(backImage);

  if (!frontValidation.valid) {
    return next(new AppError(`Front image: ${frontValidation.error}`, 400));
  }

  if (!backValidation.valid) {
    return next(new AppError(`Back image: ${backValidation.error}`, 400));
  }

  try {
    // Generate file keys
    const frontImageKey = s3Service.generateFileKey(
      frontImage.originalname,
      userId,
      documentType,
      "front"
    );
    const backImageKey = s3Service.generateFileKey(
      backImage.originalname,
      userId,
      documentType,
      "back"
    );

    // Upload files to S3
    const frontUploadResult = await s3Service.uploadFile(
      frontImage.buffer,
      frontImageKey,
      frontImage.mimetype
    );

    const backUploadResult = await s3Service.uploadFile(
      backImage.buffer,
      backImageKey,
      backImage.mimetype
    );

    // Create KYC record
    const kycData = {
      userId,
      documentType,
      frontImage: {
        key: frontUploadResult.key,
      },
      backImage: {
        key: backUploadResult.key,
      },
    };

    const kyc = await KYC.create(kycData);

    // Update user KYC status
    await User.findByIdAndUpdate(userId, { kycStatus: "applied" });

    // Remove sensitive data from response
    const responseData = {
      kyc: {
        id: kyc._id,
        documentType: kyc.documentType,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
      },
      message:
        "KYC documents submitted successfully. Please wait for verification.",
    };

    return sendSuccessResponse(res, 201, responseData);
  } catch (error) {
    // If something goes wrong, clean up any uploaded files
    if (frontImageKey) {
      try {
        await s3Service.deleteFile(frontImageKey);
      } catch (deleteError) {
        console.error("Failed to delete front image after error:", deleteError);
      }
    }
    if (backImageKey) {
      try {
        await s3Service.deleteFile(backImageKey);
      } catch (deleteError) {
        console.error("Failed to delete back image after error:", deleteError);
      }
    }

    return next(
      new AppError("Failed to submit KYC documents. Please try again.", 500)
    );
  }
});

/**
 * Get KYC status for the authenticated user
 * @route GET /api/kyc/status
 * @access Private
 */
const getKYCStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const kyc = await KYC.findOne({ userId });
  const user = await User.findById(userId).select("kycStatus");

  if (!kyc) {
    return sendSuccessResponse(res, 200, {
      kycStatus: user.kycStatus,
      message: "No KYC submission found",
    });
  }

  // Generate presigned URLs for images (valid for 1 hour)
  const kycWithUrls = await s3Service.generateKYCImageUrls(kyc, 3600);

  const responseData = {
    kyc: {
      id: kycWithUrls._id,
      documentType: kycWithUrls.documentType,
      status: kycWithUrls.status,
      submittedAt: kycWithUrls.submittedAt,
      reviewedAt: kycWithUrls.reviewedAt,
      rejectionReason: kycWithUrls.rejectionReason,
      frontImage: kycWithUrls.frontImage,
      backImage: kycWithUrls.backImage,
    },
    kycStatus: user.kycStatus,
  };

  return sendSuccessResponse(res, 200, responseData);
});

/**
 * Resubmit KYC documents (if previous was rejected)
 * @route POST /api/kyc/resubmit
 * @access Private
 */
const resubmitKYC = catchAsync(async (req, res, next) => {
  const { documentType } = req.body;
  const userId = req.user._id;

  // Validate document type
  const validDocumentTypes = ["Aadhar card", "PAN card", "Driving licence"];
  if (!validDocumentTypes.includes(documentType)) {
    return next(
      new AppError(
        "Invalid document type. Must be one of: Aadhar card, PAN card, Driving licence",
        400
      )
    );
  }

  // Check if user has a rejected KYC
  const existingKYC = await KYC.findOne({ userId });
  if (!existingKYC || existingKYC.status !== "rejected") {
    return next(
      new AppError(
        "No rejected KYC found. Please submit a new KYC application.",
        400
      )
    );
  }

  // Check if files are uploaded
  if (!req.files || !req.files.frontImage || !req.files.backImage) {
    return next(new AppError("Both front and back images are required", 400));
  }

  const frontImage = req.files.frontImage[0];
  const backImage = req.files.backImage[0];

  // Validate files
  const frontValidation = s3Service.validateFile(frontImage);
  const backValidation = s3Service.validateFile(backImage);

  if (!frontValidation.valid) {
    return next(new AppError(`Front image: ${frontValidation.error}`, 400));
  }

  if (!backValidation.valid) {
    return next(new AppError(`Back image: ${backValidation.error}`, 400));
  }

  try {
    // Delete old files from S3
    if (existingKYC.frontImage.key) {
      await s3Service.deleteFile(existingKYC.frontImage.key);
    }
    if (existingKYC.backImage.key) {
      await s3Service.deleteFile(existingKYC.backImage.key);
    }

    // Generate new file keys
    const frontImageKey = s3Service.generateFileKey(
      frontImage.originalname,
      userId,
      documentType,
      "front"
    );
    const backImageKey = s3Service.generateFileKey(
      backImage.originalname,
      userId,
      documentType,
      "back"
    );

    // Upload new files to S3
    const frontUploadResult = await s3Service.uploadFile(
      frontImage.buffer,
      frontImageKey,
      frontImage.mimetype
    );

    const backUploadResult = await s3Service.uploadFile(
      backImage.buffer,
      backImageKey,
      backImage.mimetype
    );

    // Update KYC record
    existingKYC.documentType = documentType;
    existingKYC.frontImage = {
      key: frontUploadResult.key,
    };
    existingKYC.backImage = {
      key: backUploadResult.key,
    };
    existingKYC.status = "applied";
    existingKYC.rejectionReason = undefined;
    existingKYC.reviewedBy = undefined;
    existingKYC.reviewedAt = undefined;
    existingKYC.submittedAt = new Date();

    await existingKYC.save();

    // Update user KYC status
    await User.findByIdAndUpdate(userId, { kycStatus: "applied" });

    const responseData = {
      kyc: {
        id: existingKYC._id,
        documentType: existingKYC.documentType,
        status: existingKYC.status,
        submittedAt: existingKYC.submittedAt,
      },
      message:
        "KYC documents resubmitted successfully. Please wait for verification.",
    };

    return sendSuccessResponse(res, 200, responseData);
  } catch (error) {
    return next(
      new AppError("Failed to resubmit KYC documents. Please try again.", 500)
    );
  }
});

/**
 * Get KYC images with presigned URLs for frontend display
 * @route GET /api/kyc/:id/images
 * @access Private
 */
const getKYCImages = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const kyc = await KYC.findOne({ _id: id, userId });
  if (!kyc) {
    return next(new AppError("KYC submission not found", 404));
  }

  // Generate presigned URLs for images (valid for 1 hour)
  const kycWithUrls = await s3Service.generateKYCImageUrls(kyc, 3600);

  const responseData = {
    kyc: {
      id: kycWithUrls._id,
      documentType: kycWithUrls.documentType,
      status: kycWithUrls.status,
      frontImage: kycWithUrls.frontImage,
      backImage: kycWithUrls.backImage,
    },
  };

  return sendSuccessResponse(res, 200, responseData);
});

module.exports = {
  submitKYC,
  getKYCStatus,
  resubmitKYC,
  getKYCImages,
};
