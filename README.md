# OneThing 紹介サイト

筑波大学エンジニアコミュニティ「OneThing」の紹介サイトです。Astro で静的サイトとしてビルドし、GitHub Pages に GitHub Actions 経由で公開します。

## 開発

```sh
npm install
npm run dev
```

STARTiX の公開 iCal URL を差し替える場合は、ローカルでは `.env` に次の環境変数を設定してください。

```sh
STARTIX_CALENDAR_ICS_URL=https://calendar.google.com/calendar/ical/.../public/basic.ics
```

## ビルド

```sh
npm run build
```

ビルド成果物は `dist/` に生成されます。`dist/` は GitHub Actions で生成して公開するため、リポジトリには含めません。

## 主な構成

```text
src/
  layouts/BaseLayout.astro
  layouts/DashboardLayout.astro
  lib/calendar.ts
  pages/index.astro
  pages/calender/index.astro
  pages/dashboard.astro
  pages/[dashboard].astro
  styles/dashboard.css
  styles/dashboard-world.css
  styles/global.css
astro.config.mjs
.github/workflows/deploy.yml
```

既存URLとの互換性を優先し、カレンダーページは `/calender` のままにしています。
ダッシュボードページは `/dashboard` から `/dashboard100` まであり、Google Calendarの公開ICSをビルド時に取得して今後のイベントを表示します。

## 公開

GitHub の repository settings で Pages の Source を `GitHub Actions` に設定してください。`main` ブランチに push すると `.github/workflows/deploy.yml` が実行され、Astro のビルド結果が GitHub Pages にデプロイされます。

STARTiX の公開 iCal URL を本番で差し替える場合は、GitHub の repository variables に `STARTIX_CALENDAR_ICS_URL` を追加してください。

イベント情報を定期更新するため、GitHub Actions は1時間ごとにも実行されます。ダッシュボードは1時間ごとにランダムで別デザインへ遷移し、左下の `NEXT DESIGN` から手動でも切り替えできます。
