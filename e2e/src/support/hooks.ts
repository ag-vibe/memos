import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from "@cucumber/cucumber";
import type { Browser } from "@playwright/test";
import { chromium } from "@playwright/test";

import { cleanupE2EUsers } from "./db-cleanup.js";
import { e2eEnv } from "./env.js";
import { CustomWorld } from "./world.js";

let browser: Browser;
const isDryRun = process.argv.includes("--dry-run");

setDefaultTimeout(Math.max(e2eEnv.defaultTimeoutMs, 30000));

BeforeAll(async () => {
  if (isDryRun) return;

  await cleanupE2EUsers();

  browser = await chromium.launch({
    channel: "chrome",
    headless: e2eEnv.headless,
    slowMo: e2eEnv.slowMo,
  });

  const loginResponse = await fetch(`${e2eEnv.baseUrl}/login`);
  if (!loginResponse.ok) {
    throw new Error(`Frontend is not reachable at ${e2eEnv.baseUrl}/login`);
  }

  const apiResponse = await fetch(`${e2eEnv.apiBaseUrl}/memos`);
  if (![200, 401].includes(apiResponse.status)) {
    throw new Error(`API is not reachable at ${e2eEnv.apiBaseUrl}/memos`);
  }
});

Before(async function (this: CustomWorld) {
  if (isDryRun) return;

  this.browser = browser;
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
});

After(async function (this: CustomWorld, { pickle, result }) {
  if (isDryRun) return;

  if (result?.status === Status.FAILED) {
    await this.ensureArtifactsDir();
    const filePath = this.screenshotPath(pickle.uri, pickle.name);
    await this.page.screenshot({ path: filePath, fullPage: true });
    this.attach(`Screenshot: ${filePath}`);
  }

  await this.context.close();
});

AfterAll(async () => {
  if (isDryRun) return;
  await browser.close();
  await cleanupE2EUsers();
});
