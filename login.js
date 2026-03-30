const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://app.eigosapuri.jp/");

  console.log("ログインして Enter を押して");
  await new Promise((resolve) => process.stdin.once("data", resolve));

  await context.storageState({ path: "auth.json" });

  console.log("auth.json 保存完了");

  await browser.close();
})();
