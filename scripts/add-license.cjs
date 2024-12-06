const fs = require("fs");
const path = require("path");

const licenseText = `/*
Copyright 2024 Voibo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/`;

function prependLicense(dir, isDrayRun = false) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      prependLicense(filePath);
    } else if (
      filePath.endsWith(".js") ||
      filePath.endsWith(".cjs") ||
      filePath.endsWith(".ts") ||
      filePath.endsWith(".tsx")
    ) {
      const content = fs.readFileSync(filePath, "utf8");
      if (
        !content.startsWith(
          `/*
Copyright 2024 Voibo`
        )
      ) {
        if (!isDrayRun) {
          fs.writeFileSync(filePath, licenseText + "\n" + content);
        }
        console.log(`Add license: ${filePath}`);
      }
    }
  }
}

const targetDir = "./src";
prependLicense(targetDir, false);
console.log("Finished");
