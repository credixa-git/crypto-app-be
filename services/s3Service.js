const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const AppConfig = require("../config/appConfig");

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: AppConfig.aws.region,
      credentials: {
        accessKeyId: AppConfig.aws.accessKeyId,
        secretAccessKey: AppConfig.aws.secretAccessKey,
      },
    });

    this.bucketName =
      AppConfig.aws.s3?.bucketName || process.env.AWS_S3_BUCKET_NAME;

    if (!this.bucketName) {
      throw new Error(
        "AWS S3 bucket name is required. Please set AWS_S3_BUCKET_NAME environment variable."
      );
    }
  }

  /**
   * Generate a unique file key for S3
   * @param {string} originalName - Original filename
   * @param {string} userId - User ID
   * @param {string} documentType - Type of document
   * @param {string} side - Front or back of document
   * @returns {string} - Unique file key
   */
  generateFileKey(originalName, userId, documentType, side) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    const fileExtension = originalName.split(".").pop();

    return `kyc/${userId}/${documentType}/${side}_${timestamp}_${randomString}.${fileExtension}`;
  }

  /**
   * Upload file to S3
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileKey - S3 file key
   * @param {string} contentType - File content type
   * @returns {Promise<Object>} - Upload result with URL and key
   */
  async uploadFile(fileBuffer, fileKey, contentType) {
    try {
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: "private", // Private access for security
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Generate the S3 URL
      const fileUrl = `https://${this.bucketName}.s3.${AppConfig.aws.region}.amazonaws.com/${fileKey}`;

      return {
        url: fileUrl,
        key: fileKey,
        success: true,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   * @param {string} fileKey - S3 file key
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(fileKey) {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: fileKey,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);

      return true;
    } catch (error) {
      console.error("S3 delete error:", error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for file access (if needed for admin review)
   * @param {string} fileKey - S3 file key
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Presigned URL
   */
  async generatePresignedUrl(fileKey, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      console.error("S3 presigned URL generation error:", error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Validate file type and size
   * @param {Object} file - Multer file object
   * @returns {Object} - Validation result
   */
  validateFile(file) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error:
          "Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed",
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File size too large. Maximum size is 5MB",
      };
    }

    return { valid: true };
  }
}

module.exports = new S3Service();
