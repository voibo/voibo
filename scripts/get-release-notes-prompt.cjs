const { execSync } = require("child_process");

function getGitTags() {
  return execSync("git tag --sort=-v:refname", { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);
}

function getCommitsBetweenTags(previousTag, latestTag) {
  const command = `git log ${previousTag}..${latestTag} --pretty=format:"%h %s"`;
  return execSync(command, { encoding: "utf-8" }).split("\n").filter(Boolean);
}

function determineVersionChange(previousTag, latestTag) {
  const [prevMajor, prevMinor, prevPatch] = previousTag
    .replace("v", "")
    .split(".")
    .map(Number);
  const [latestMajor, latestMinor, latestPatch] = latestTag
    .replace("v", "")
    .split(".")
    .map(Number);

  if (latestMajor > prevMajor) return "major";
  if (latestMinor > prevMinor) return "minor";
  if (latestPatch > prevPatch) return "patch";
  return "unknown";
}

function generateReleaseNotes() {
  const tags = getGitTags();
  if (tags.length < 2) {
    console.error("Not enough tags to generate release notes.");
    process.exit(1);
  }

  const [latestTag, previousTag] = tags;
  const commits = getCommitsBetweenTags(previousTag, latestTag);
  const versionChange = determineVersionChange(previousTag, latestTag);

  let template;
  switch (versionChange) {
    case "major":
      template = `# Major Version Update: ${previousTag} → ${latestTag}

## Overview
This is a major version update that introduces significant changes to the codebase, including breaking changes and architectural improvements.

## Breaking Changes
- [List major breaking changes here]

## New Features
- [List significant new features here]

## Improvements
- [List major improvements here]

## Migration Guide
Please refer to the migration guide for detailed instructions on how to update from ${previousTag}.`;
      break;
    case "minor":
      template = `# Minor Version Update: ${previousTag} → ${latestTag}

## Overview
This is a minor version update that introduces new features and enhancements while maintaining backward compatibility.

## New Features
- [List new features here]

## Enhancements
- [List enhancements here]

## API Changes
- [List any API changes that are not breaking]`;
      break;
    case "patch":
      template = `# Patch Version Update: ${previousTag} → ${latestTag}

## Overview
This is a patch update that includes bug fixes, performance improvements, and minor updates.

## Bug Fixes
- [List bug fixes here]

## Performance Improvements
- [List performance improvements if any]

## Other Changes
- [List other minor changes]`;
      break;
    default:
      template = `# Update: ${previousTag} → ${latestTag}

## Overview
This update includes various changes to the codebase. Please review the commits for details.`;
  }

  const llmPrompt = [
    "# Release Note Generation Task",
    "",
    `You are a technical documentation expert. Please create release notes for the ${versionChange} version update from ${previousTag} to ${latestTag}.`,
    "",
    "## Input Information",
    "",
    "### Version Information:",
    `- Previous version: ${previousTag}`,
    `- New version: ${latestTag}`,
    `- Update type: ${versionChange}`,
    "",
    "### Template:",
    template,
    "",
    "### Commit List:",
    ...commits.map((commit) => `- ${commit}`),
    "",
    "## Instructions",
    "",
    "1. Analyze the commit list above and group related commits",
    "2. Add appropriate information to each section and replace the [List...] parts in the template with actual content",
    "3. Aim for technical and concise explanations",
    "4. If something cannot be determined from the commits, remove the generic placeholder text",
    "5. Output a complete release note formatted in Markdown",
    "6. Do not include any additional comments or explanations",
    "7. Must use English language",
  ].join("\n");

  console.log(llmPrompt);
}

generateReleaseNotes();
