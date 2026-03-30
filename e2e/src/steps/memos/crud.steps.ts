import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

import { selectors } from "../../support/selectors.js";
import { CustomWorld } from "../../support/world.js";

When("用户创建一条新的 memo", async function (this: CustomWorld) {
  console.log("   📍 Step: 创建一条新的 memo...");
  const content = `E2E memo ${this.runId} #tag`;
  this.lastMemoContent = content;

  await this.page.locator(selectors.memoContentInput).fill(content);
  await this.page.locator(selectors.memoSubmit).click();

  console.log(`   ✅ 已提交 memo "${content}"`);
});

Then("新 memo 应该出现在列表中", async function (this: CustomWorld) {
  console.log("   📍 Step: 验证新 memo 出现在列表中...");
  const content = this.lastMemoContent;
  if (!content) throw new Error("Expected lastMemoContent to be defined");

  await expect(this.memoCard(content)).toBeVisible();
  console.log("   ✅ 新 memo 已出现在列表中");
});
