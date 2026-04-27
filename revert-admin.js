const fs = require('fs');
let c = fs.readFileSync('src/app/api/admin/run-tests/route.ts', 'utf8');

// Replace the block using a regex that handles whitespace/newlines flexibly
c = c.replace(
  /const runTestCase = async \(tc: typeof testCases\[0\], idx: number\) => \{\s*try \{\s*let result;\s*if \(process\.env\.PISTON_API_URL\) \{\s*result = await runViaPiston\(language, wrappedCode, tc\.input \|\| ""\);\s*\} else \{\s*result = await runCode\(language, wrappedCode, tc\.input \|\| ""\);\s*\}/,
  'const runTestCase = async (tc: typeof testCases[0], idx: number) => {\n      try {\n        const result = await runCode(language, wrappedCode, tc.input || "");'
);

fs.writeFileSync('src/app/api/admin/run-tests/route.ts', c);
console.log('Reverted admin run-tests successfully.');
