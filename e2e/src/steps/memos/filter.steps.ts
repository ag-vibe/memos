import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

import { selectors } from "../../support/selectors.js";
import { CustomWorld } from "../../support/world.js";

function memoFilterFixture(world: CustomWorld) {
  const slug = world.runId.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const tag = `tag${slug}`;

  return {
    tag,
    taggedContent: `E2E tagged memo ${world.runId} #${tag}`,
    otherContent: `E2E other memo ${world.runId} #other${slug}`,
  };
}

async function createMemo(world: CustomWorld, content: string) {
  await world.page.locator(selectors.memoContentInput).fill(content);
  await world.page.locator(selectors.memoSubmit).click();
  await expect(world.memoCard(content)).toBeVisible();
}

Given("列表中存在可按标签筛选的 memo", async function (this: CustomWorld) {
  console.log("   📍 Step: 准备一组可按标签筛选的 memo...");
  const { taggedContent, otherContent } = memoFilterFixture(this);

  await createMemo(this, taggedContent);
  await createMemo(this, otherContent);

  console.log("   ✅ 已创建带目标标签和非目标标签的 memo");
});

When("用户按该标签筛选 memo 列表", async function (this: CustomWorld) {
  console.log("   📍 Step: 使用侧边栏标签筛选 memo 列表...");
  const { tag } = memoFilterFixture(this);
  const tagButton = this.page.locator(selectors.sidebarTagButton(tag));

  await expect(tagButton).toBeVisible();
  await tagButton.click();

  console.log(`   ✅ 已按标签 "#${tag}" 筛选 memo 列表`);
});

Then("列表中只应显示带该标签的 memo", async function (this: CustomWorld) {
  console.log("   📍 Step: 验证列表仅显示目标标签对应的 memo...");
  const { tag, taggedContent, otherContent } = memoFilterFixture(this);

  await expect(this.page.locator(selectors.memoListHeading)).toHaveText(`#${tag}`);
  await expect(this.memoCard(taggedContent)).toBeVisible();
  await expect(this.memoCard(otherContent)).toHaveCount(0);

  console.log("   ✅ 列表只显示带目标标签的 memo");
});

Then("用户清除该标签筛选后应该看到全部相关 memo", async function (this: CustomWorld) {
  console.log("   📍 Step: 清除标签筛选并验证列表恢复...");
  const { taggedContent, otherContent } = memoFilterFixture(this);

  await this.page.locator(selectors.sidebarTagAll).click();
  await expect(this.memoCard(taggedContent)).toBeVisible();
  await expect(this.memoCard(otherContent)).toBeVisible();

  console.log("   ✅ 清除标签筛选后列表已恢复");
});
