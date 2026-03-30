import { cleanupE2EUsers, describeE2EData } from "../src/support/db-cleanup.js";

console.log("E2E data before cleanup:");
console.log(await describeE2EData());

await cleanupE2EUsers();

console.log("E2E data after cleanup:");
console.log(await describeE2EData());
