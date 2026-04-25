import fs from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = pkg.version;
const changelogPath = './CHANGELOG.md';

let changelog = fs.readFileSync(changelogPath, 'utf8');

// Check if version already exists in changelog to avoid duplicates
if (changelog.includes(`## ${version}`)) {
  process.exit(0);
}

// Insert the new version header after the main title
const titleLine = '# Changelog\n';
if (changelog.startsWith(titleLine)) {
  const newContent = `${titleLine}\n## ${version}\n\n- (Add changes here)\n${changelog.slice(titleLine.length)}`;
  fs.writeFileSync(changelogPath, newContent);
  console.log(`Updated ${changelogPath} with version ${version}`);
} else {
  console.error('CHANGELOG.md does not start with "# Changelog"');
  process.exit(1);
}
