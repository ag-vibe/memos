import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

import { signUp, uniqueUser } from "../../support/api.js";
import { selectors } from "../../support/selectors.js";
import { CustomWorld } from "../../support/world.js";

Given("存在一个可登录的 memos 用户", async function (this: CustomWorld) {
  console.log("   📍 Step: 创建一个可登录的 memos 用户...");
  this.user = uniqueUser("memos-auth");
  await signUp(this.user);
  console.log(`   ✅ 已创建用户 "${this.user.name}"`);
});

Given("用户打开 memos 登录页", async function (this: CustomWorld) {
  console.log("   📍 Step: 打开 memos 登录页...");
  await this.goto("/login");
  await expect(this.page.locator(selectors.authPage)).toBeVisible();
  console.log("   ✅ memos 登录页已打开");
});

Given("用户已登录 memos 系统", async function (this: CustomWorld) {
  console.log("   📍 Step: 准备一个已登录的 memos 用户...");
  this.user = uniqueUser("memos-crud");
  await signUp(this.user);
  await this.goto("/login");
  await this.page.getByLabel("Username").fill(this.user.name);
  await this.page.getByLabel("Password").fill(this.user.password);
  await this.page.getByRole("button", { name: "Sign in" }).click();
  await this.expectMemosPageVisible();
  console.log(`   ✅ 用户 "${this.user.name}" 已登录`);
});

When("用户访问 memos 首页", async function (this: CustomWorld) {
  console.log("   📍 Step: 访问 memos 首页...");
  await this.goto("/");
  console.log("   ✅ 已访问 memos 首页");
});

When("用户使用该 memos 用户登录", async function (this: CustomWorld) {
  console.log("   📍 Step: 使用已创建的 memos 用户登录...");
  if (!this.user) throw new Error("Expected this.user to be defined");

  await this.page.getByLabel("Username").fill(this.user.name);
  await this.page.getByLabel("Password").fill(this.user.password);
  await this.page.getByRole("button", { name: "Sign in" }).click();
  await this.expectMemosPageVisible();
  console.log("   ✅ memos 用户登录成功");
});

Then("应该跳转到 memos 登录页", async function (this: CustomWorld) {
  console.log("   📍 Step: 验证当前页面为 memos 登录页...");
  await expect(this.page).toHaveURL(/\/login$/);
  await expect(this.page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  console.log("   ✅ 已跳转到 memos 登录页");
});

Then("用户应该进入 memos 列表页", async function (this: CustomWorld) {
  console.log("   📍 Step: 验证 memos 列表页已显示...");
  await expect(this.page).toHaveURL(/\/$/);
  await this.expectMemosPageVisible();
  await expect(this.page.getByRole("heading", { name: "All Memos" })).toBeVisible();
  console.log("   ✅ memos 列表页已显示");
});
