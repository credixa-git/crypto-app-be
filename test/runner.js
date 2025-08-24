const Mocha = require("mocha");
const path = require("path");
const fs = require("fs");

// Create a new Mocha instance
const mocha = new Mocha({
  timeout: 15000,
  reporter: "spec",
  ui: "bdd",
  color: true,
});

// Add test files
const testDir = __dirname;

// Function to recursively add test files
function addTestFiles(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      addTestFiles(filePath);
    } else if (file.endsWith(".test.js")) {
      mocha.addFile(filePath);
      console.log(`Added test file: ${filePath}`);
    }
  });
}

// Add all test files
addTestFiles(testDir);

// Run the tests
mocha.run((failures) => {
  process.exit(failures ? 1 : 0);
});
