const fs = require("fs");
const path = require("path");

const oldLicenseAuthor = `Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect`;
const newLicenseAuthor = `Copyright 2024 Voibo`;

function replaceLicense(dir, isDryRun = false) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      replaceLicense(filePath, isDryRun);
    } else if (
      filePath.endsWith(".js") ||
      filePath.endsWith(".cjs") ||
      filePath.endsWith(".ts") ||
      filePath.endsWith(".tsx")
    ) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes(oldLicenseAuthor)) {
        const updatedContent = content.replace(
          oldLicenseAuthor,
          newLicenseAuthor
        );
        if (!isDryRun) {
          fs.writeFileSync(filePath, updatedContent, "utf8");
        }
        console.log(`Updated license in: ${filePath}`);
      }
    }
  }
}

const targetDir = "./src";
replaceLicense(targetDir, false);
console.log("License update completed.");
