const { chromium } = require("playwright");
const readline = require("readline");

// ===== 設定 =====
const URL =
  "https://app.eigosapuri.jp/es/homeworks/f450ebbc-0b27-11f1-8e94-9e6ed764761c";

(async () => {
  // ===== ブラウザ起動 =====
  const browser = await chromium.launch({
    headless: false, // 画面表示（デバッグしやすい）
    slowMo: 0, // 操作を少し遅らせる（安定性・人間っぽさ）
  });

  // ===== ログイン状態読み込み =====
  const context = await browser.newContext({
    storageState: "auth.json", // 事前に保存したログイン情報
  });

  const page = await context.newPage();

  // ===== ページ遷移 =====
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // ===== ユーザー入力待機 =====
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("準備完了。Enterキーを押すとループを開始します...");

  await new Promise((resolve) => {
    rl.once("line", () => {
      rl.close();
      resolve();
    });
  });

  console.log("ループ開始");

  // ===== 安全制御 =====
  let step = 0;
  let isShuttingDown = false;

  // ===== グレースフルシャットダウン =====
  const shutdown = async () => {
    isShuttingDown = true;
    console.log("\n終了します...");
    try {
      await browser.close();
    } catch (e) {
      // ブラウザクローズエラーを無視
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown); // Ctrl+C対応

  // ===== メインループ =====
  while (true) {
    if (isShuttingDown) break; // シャットダウン中はループを抜ける
    step++;
    console.log(`step: ${step}`);

    try {
      if (isShuttingDown) break; // シャットダウンチェック

      // ===== ページ読み込み待機 =====
      await page.waitForLoadState("networkidle").catch(() => {});

      // ===== どれかのボタンが出るまで待つ =====
      // 複数セレクタをカンマ区切りで指定
      await page.waitForSelector(
        [
          '[data-e2e="button-start"]',
          '[data-e2e="button-show-answer"]',
          '[data-e2e="button-correct"]',
          '[data-e2e="button-training-next"]',
          '[data-e2e="result-button-next"]',
          'button:text("次のレッスンへ")',
        ].join(","),
        { timeout: 5000 }, // タイムアウト時間を短くする
      );

      // ===== 表示されているボタンだけ押す =====

      // 0) はじめる
      if (await page.locator('[data-e2e="button-start"]').isVisible()) {
        const btnElement = await page
          .locator('[data-e2e="button-start"]')
          .first();
        const isEnabled = await btnElement.isEnabled();
        console.log(
          `start - isVisible:true, isEnabled:${isEnabled}, テキスト内容を確認中...`,
        );
        const btnText = await btnElement.textContent();
        console.log(`start - ボタンテキスト: "${btnText}"`);
        console.log("start - クリック中");
        await page.click('[data-e2e="button-start"]');
        await page.waitForTimeout(1500); // ページ読み込み待機を長くする
        console.log("start - クリック完了");
        continue;
      }

      // 1) 正解をチェック
      if (await page.locator('[data-e2e="button-show-answer"]').isVisible()) {
        console.log("show answer");
        await page.click('[data-e2e="button-show-answer"]');
        await page.waitForTimeout(500); // ページ読み込み待機
        continue;
      }

      // 2) できた
      if (await page.locator('[data-e2e="button-correct"]').isVisible()) {
        console.log("correct");
        await page.click('[data-e2e="button-correct"]');
        await page.waitForTimeout(500); // ページ読み込み待機
        continue;
      }

      // 3) 次へ（training）
      if (await page.locator('[data-e2e="button-training-next"]').isVisible()) {
        console.log("training next");
        await page.click('[data-e2e="button-training-next"]');
        await page.waitForTimeout(500); // ページ読み込み待機
        continue;
      }

      // 4) 次へ（result）
      if (await page.locator('[data-e2e="result-button-next"]').isVisible()) {
        console.log("result next");
        await page.click('[data-e2e="result-button-next"]');
        await page.waitForTimeout(500); // ページ読み込み待機
        continue;
      }

      // 5) 次のレッスンへ
      const nextLessonBtn = page
        .locator('button:text("次のレッスンへ")')
        .first();
      if (await nextLessonBtn.isVisible().catch(() => false)) {
        console.log("next lesson");
        await nextLessonBtn.click();
        await page.waitForTimeout(500); // ページ読み込み待機
        continue;
      }
    } catch (e) {
      // ===== タイムアウト時 =====
      if (!isShuttingDown && !e.message.includes("closed")) {
        console.log("ボタンが見つからない → 待機継続");
      }
      continue;
    }

    // ===== CPU負荷軽減 =====
    // 連続ループで負荷をかけないよう少し待つ
    await page.waitForTimeout(300);
  }

  console.log(`\n処理終了 (step: ${step})`);

  try {
    await browser.close();
  } catch (e) {
    // ブラウザクローズエラーを無視
  }
  process.exit(0);
})();
