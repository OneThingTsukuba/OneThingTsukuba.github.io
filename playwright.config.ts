import { defineConfig, devices } from '@playwright/test';

/**
 * E2E は「本番と同じ静的成果物」に対して走らせる。
 * astro dev だと HMR 用のクライアントスクリプトが差し込まれるため、
 * JS 無効時の挙動（モバイルナビの到達性）を正しく検証できない。
 *
 * ポートは 4331。開発中の astro dev (4321) とぶつからない値にしてある。
 */
const PORT = 4331;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // .only の commit をCIで落とす。ローカルでは許す
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },

  // プロジェクトは1つ。幅は各テストが自分で宣言する。
  // mobile / desktop の2プロジェクトに分けると、同じテストが両方の幅で走り、
  // 「768px で開閉できる」が desktop 側で必ず落ちる
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // build 済みの dist を配信する。テスト実行前に必ずビルドし直す
    // --host 127.0.0.1 は必須。付けないと astro preview は [::1] にしか
    // bind せず、baseURL の 127.0.0.1 に到達できずタイムアウトする
    command: `npm run build && npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
