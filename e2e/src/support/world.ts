import { World, setWorldConstructor } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import type { IWorldOptions } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { E2EUser } from "./api.js";
import { e2eEnv } from "./env.js";
import { selectors } from "./selectors.js";

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  runId: string;
  user?: E2EUser;
  lastMemoContent?: string;

  constructor(options: IWorldOptions) {
    super(options);
    this.runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async goto(pathname: string): Promise<void> {
    await this.page.goto(new URL(pathname, e2eEnv.baseUrl).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async expectMemosPageVisible(): Promise<void> {
    await expect(this.page.locator(selectors.memosPage)).toBeVisible();
  }

  memoCard(content: string) {
    return this.page.locator(selectors.memoCard).filter({ hasText: content }).first();
  }

  screenshotPath(featureName: string, scenarioName: string): string {
    const safe = `${featureName}-${scenarioName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return path.join(process.cwd(), "e2e", "artifacts", "screenshots", `${safe}-${Date.now()}.png`);
  }

  async ensureArtifactsDir(): Promise<void> {
    await mkdir(path.join(process.cwd(), "e2e", "artifacts", "screenshots"), { recursive: true });
  }
}

setWorldConstructor(CustomWorld);
