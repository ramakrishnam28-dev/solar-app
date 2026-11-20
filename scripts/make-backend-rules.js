// Regenerates src/lib/__tests__/backend-rules.json from your backend.
// Usage:  node scripts/make-backend-rules.js "C:\path\to\backend\src"
const Module = require('module'); const path = require('path'); const fs = require('fs');
const src = process.argv[2];
if (!src) { console.error('Give the path to the backend src folder.'); process.exit(1); }
const orig = Module._load;
Module._load = function (req, parent, ...r) { if (/config[\\/]db|ApiError|customerAuditLog/.test(req)) return {}; return orig.call(this, req, parent, ...r); };
const se = require(path.join(src, 'utils', 'statusEngine.js'));
const wf = require(path.join(src, 'utils', 'workflow.js'));
const out = path.join(__dirname, '..', 'src', 'lib', '__tests__', 'backend-rules.json');
fs.writeFileSync(out, JSON.stringify({ VALID_TRANSITIONS: se.VALID_TRANSITIONS, STATUS_RANK: se.STATUS_RANK, LOAN_STEPS: wf.LOAN_STEPS.map((s) => s.key), CASH_STEPS: wf.CASH_STEPS.map((s) => s.key) }, null, 1));
console.log('Wrote', out, '- now run npm test. If a test fails, src/lib/rules.ts needs the same change.');
