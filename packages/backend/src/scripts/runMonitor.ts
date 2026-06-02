/**
 * Standalone rate monitor script.
 * Run with: make monitor
 * Can also be triggered via cron:
 *   0 9 * * 1 cd /path/to/miles && make monitor >> logs/monitor.log 2>&1
 */

import "dotenv/config";
import { runRateMonitor } from "../services/rateMonitorAgent.js";

console.log(`[${new Date().toISOString()}] Rate monitor starting...\n`);

runRateMonitor()
  .then((summary) => {
    console.log("\n── Monitor complete ──────────────────────");
    console.log(`Cards checked:    ${summary.checkedCards}`);
    console.log(`Changes detected: ${summary.changesDetected}`);

    if (summary.changes.length > 0) {
      console.log("\nPending changes:");
      for (const c of summary.changes) {
        console.log(`  ${c.cardName} · ${c.rateDescription}`);
        console.log(`    ${c.field}: ${c.oldValue} → ${c.newValue}`);
      }
      console.log("\nReview at: GET /admin/monitor/pending");
    }

    if (summary.errors.length > 0) {
      console.log("\nErrors:");
      for (const e of summary.errors) console.log(`  ✗ ${e}`);
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error("Monitor failed:", err);
    process.exit(1);
  });
