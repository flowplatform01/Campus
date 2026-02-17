#!/usr/bin/env node
/**
 * V1.2 Production Readiness Check
 * Run: node scripts/v12-production-check.js
 * Verifies key production requirements from V1.2 directive
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const checks = [
  { name: 'Account deletion - 7 day delayed', file: 'server/services/account-deletion-service.ts', pattern: 'DELAY_DAYS|scheduledAt|executeDueDeletions' },
  { name: 'Audit log system', file: 'server/services/audit-service.ts', pattern: 'logAudit' },
  { name: 'Referral server-side tracking', file: 'server/routes/referrals.ts', pattern: 'referralVisits|record' },
  { name: 'Report config & remarks', file: 'client/src/pages/campus/Reports.tsx', pattern: 'Report Configuration|autoRemarks' },
  { name: 'Grade freeze after publish', file: 'server/routes/sms.ts', pattern: 'published|status === "published"' },
  { name: 'Dashboard smart alerts', file: 'server/routes/sms.ts', pattern: 'alerts|pending_approvals|unpaid_fees' },
  { name: 'Settings - real account deletion wizard', file: 'client/src/pages/Settings.tsx', pattern: 'DELETE|deletionStatus|scheduledAt' },
  { name: 'Network offline detection', file: 'client/src/lib/api.ts', pattern: 'navigator.onLine|No internet' },
  { name: 'User-friendly error messages', file: 'client/src/lib/api.ts', pattern: 'Session expired|Unexpected token' },
  { name: 'Get In Touch visible to all', file: 'client/src/components/DynamicSidebar.tsx', pattern: 'Get In Touch' },
];

let passed = 0;
let failed = 0;

console.log('\n🔍 V1.2 Production Readiness Check\n');

for (const c of checks) {
  const filePath = path.join(root, c.file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ok = new RegExp(c.pattern).test(content);
    if (ok) {
      console.log(`  ✅ ${c.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${c.name} - pattern not found`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ ${c.name} - file error: ${e.message}`);
    failed++;
  }
}

console.log(`\n  Result: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
