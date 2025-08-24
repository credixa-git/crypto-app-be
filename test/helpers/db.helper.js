const mongoose = require("mongoose");
const testConfig = require("../config/test.config");

class TestDBHelper {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mongoose.connect(testConfig.database, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("Test database connected successfully");
    } catch (error) {
      console.error("Test database connection failed:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log("Test database disconnected successfully");
      }
    } catch (error) {
      console.error("Test database disconnection failed:", error);
    }
  }

  async clearDatabase() {
    try {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
      console.log("Test database cleared successfully");
    } catch (error) {
      console.error("Test database clear failed:", error);
    }
  }

  async dropDatabase() {
    try {
      await mongoose.connection.dropDatabase();
      console.log("Test database dropped successfully");
    } catch (error) {
      console.error("Test database drop failed:", error);
    }
  }
}

module.exports = new TestDBHelper();
