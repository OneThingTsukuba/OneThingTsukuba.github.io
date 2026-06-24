# OneThing 紹介サイト

筑波大学エンジニアコミュニティ「OneThing」の紹介サイトです。Astro で静的サイトとしてビルドし、GitHub Pages に GitHub Actions 経由で公開します。

## 開発

```sh
npm install
npm run dev
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
  lib/calendar.ts
  pages/index.astro
  pages/calender/index.astro
  styles/global.css
astro.config.mjs
.github/workflows/deploy.yml
```

既存URLとの互換性を優先し、カレンダーページは `/calender` のままにしています。
Google Calendar の公開 ICS は `src/lib/calendar.ts` の `CALENDAR_SOURCES` で管理しています。トップとカレンダーページは OneThing の予定をビルド時に取得して表示します。

イベント表示用のダッシュボードは、ローカル専用サイネージ「OneCalendar」として別リポジトリ [OneThingTsukuba/OneCalendar](https://github.com/OneThingTsukuba/OneCalendar) に分離しています。

## 公開

GitHub の repository settings で Pages の Source を `GitHub Actions` に設定してください。`main` ブランチに push すると `.github/workflows/deploy.yml` が実行され、Astro のビルド結果が GitHub Pages にデプロイされます。

イベント情報を定期更新するため、GitHub Actions は1時間ごとにも実行されます。
