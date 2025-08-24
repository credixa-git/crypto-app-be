const { expect } = require("chai");
const mongoose = require("mongoose");
const KYC = require("../models/kyc.model");
const User = require("../models/user.model");

describe("KYC System", () => {
  before(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.TEST_DATABASE || "mongodb://localhost:27017/test"
    );
  });

  after(async () => {
    // Clean up and disconnect
    await KYC.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear data before each test
    await KYC.deleteMany({});
    await User.deleteMany({});
  });

  describe("KYC Model", () => {
    it("should create a KYC record with valid data", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        isVerified: true,
      });

      const kycData = {
        userId: user._id,
        documentType: "Aadhar card",
        frontImage: {
          url: "https://example.com/front.jpg",
          key: "kyc/user123/aadhar/front_123.jpg",
        },
        backImage: {
          url: "https://example.com/back.jpg",
          key: "kyc/user123/aadhar/back_123.jpg",
        },
      };

      const kyc = await KYC.create(kycData);

      expect(kyc.userId.toString()).to.equal(user._id.toString());
      expect(kyc.documentType).to.equal("Aadhar card");
      expect(kyc.status).to.equal("applied");
      expect(kyc.frontImage.url).to.equal(kycData.frontImage.url);
      expect(kyc.backImage.url).to.equal(kycData.backImage.url);
    });

    it("should validate document type enum", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        isVerified: true,
      });

      const invalidKycData = {
        userId: user._id,
        documentType: "Invalid Document",
        frontImage: {
          url: "https://example.com/front.jpg",
          key: "kyc/user123/invalid/front_123.jpg",
        },
        backImage: {
          url: "https://example.com/back.jpg",
          key: "kyc/user123/invalid/back_123.jpg",
        },
      };

      try {
        await KYC.create(invalidKycData);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect(error.name).to.equal("ValidationError");
      }
    });

    it("should have virtual properties working correctly", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        isVerified: true,
      });

      const kyc = await KYC.create({
        userId: user._id,
        documentType: "PAN card",
        frontImage: {
          url: "https://example.com/front.jpg",
          key: "kyc/user123/pan/front_123.jpg",
        },
        backImage: {
          url: "https://example.com/back.jpg",
          key: "kyc/user123/pan/back_123.jpg",
        },
      });

      expect(kyc.isPendingReview).to.be.true;
      expect(kyc.isApproved).to.be.false;
      expect(kyc.isRejected).to.be.false;
    });
  });

  describe("KYC Methods", () => {
    it("should approve KYC correctly", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        isVerified: true,
      });

      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
        isVerified: true,
      });

      const kyc = await KYC.create({
        userId: user._id,
        documentType: "Driving licence",
        frontImage: {
          url: "https://example.com/front.jpg",
          key: "kyc/user123/licence/front_123.jpg",
        },
        backImage: {
          url: "https://example.com/back.jpg",
          key: "kyc/user123/licence/back_123.jpg",
        },
      });

      kyc.approve(adminUser._id);
      await kyc.save();

      expect(kyc.status).to.equal("verified");
      expect(kyc.reviewedBy.toString()).to.equal(adminUser._id.toString());
      expect(kyc.reviewedAt).to.exist;
      expect(kyc.rejectionReason).to.be.undefined;
    });

    it("should reject KYC correctly", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        isVerified: true,
      });

      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
        isVerified: true,
      });

      const kyc = await KYC.create({
        userId: user._id,
        documentType: "Aadhar card",
        frontImage: {
          url: "https://example.com/front.jpg",
          key: "kyc/user123/aadhar/front_123.jpg",
        },
        backImage: {
          url: "https://example.com/back.jpg",
          key: "kyc/user123/aadhar/back_123.jpg",
        },
      });

      const rejectionReason =
        "Documents are unclear. Please provide clearer images.";
      kyc.reject(adminUser._id, rejectionReason);
      await kyc.save();

      expect(kyc.status).to.equal("rejected");
      expect(kyc.reviewedBy.toString()).to.equal(adminUser._id.toString());
      expect(kyc.reviewedAt).to.exist;
      expect(kyc.rejectionReason).to.equal(rejectionReason);
    });
  });

  describe("User Model KYC Status", () => {
    it("should have default KYC status", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(user.kycStatus).to.equal("not applied");
    });

    it("should accept valid KYC status values", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        kycStatus: "verified",
      });

      expect(user.kycStatus).to.equal("verified");
    });
  });
});
