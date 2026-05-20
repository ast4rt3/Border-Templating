const fs = require('fs');
const path = require('path');

const templateDir = path.join(__dirname, '..', 'assets', 'img', 'imgtemplate');
const manifestPath = path.join(templateDir, 'templates.json');
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const files = fs.readdirSync(templateDir)
  .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))
  .sort((a, b) => a.localeCompare(b));

fs.writeFileSync(manifestPath, `${JSON.stringify(files, null, 2)}\n`);
console.log(`Generated ${path.relative(process.cwd(), manifestPath)} with ${files.length} templates.`);
