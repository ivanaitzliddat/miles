import { CARD_DEFINITIONS } from "@miles-tracker/shared";

// Verify that the shared package is accessible
console.log("Miles Tracker Backend");
console.log(`Loaded ${CARD_DEFINITIONS.length} card definitions:`);
CARD_DEFINITIONS.forEach((card) => {
  console.log(`  - ${card.fullName} (${card.bank})`);
});
console.log("\nModule 1 setup complete! Backend can import from shared package.");
