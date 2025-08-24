const express = require("express");
const mongoose = require("mongoose");
const testConfig = require("../config/test.config");

class TestServerHelper {
  constructor() {
    this.app = null;
    this.server = null;
    this.port = testConfig.port;
  }

  async createTestServer() {
    try {
      // Create Express app
      this.app = express();

      // Middleware
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));

      // Test routes for health check
      this.app.get("/health", (req, res) => {
        res.status(200).json({ status: "OK", message: "Test server running" });
      });

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`Test server running on port ${this.port}`);
      });

      return this.app;
    } catch (error) {
      console.error("Test server creation failed:", error);
      throw error;
    }
  }

  async closeTestServer() {
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        console.log("Test server closed successfully");
      }
    } catch (error) {
      console.error("Test server close failed:", error);
    }
  }

  getApp() {
    return this.app;
  }

  getPort() {
    return this.port;
  }
}

module.exports = new TestServerHelper();
