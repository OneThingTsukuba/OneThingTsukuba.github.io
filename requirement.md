# Requirement.md

## 1. はじめに
このドキュメントは、GitHub Pages上に構築されるOneThing紹介サイトのリポジトリに必要なファイル構成およびコンテンツ要件を定義するものです。本サイトはAstroで静的サイトとして生成し、OneThingの概要、目的、活動内容、参加方法、運営体制、お問い合わせに関する情報をユーザーに提供します。

## 2. リポジトリ構成
リポジトリの基本ディレクトリとファイル構成は以下の通りです。
```
/ (ルート)
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro       # 共通レイアウト
│   │   └── DashboardLayout.astro  # ダッシュボード用レイアウト
│   ├── lib/
│   │   └── calendar.ts        # ICS取得・パース処理
│   ├── pages/
│   │   ├── index.astro        # トップページ
│   │   ├── dashboard.astro    # イベントダッシュボード
│   │   ├── [dashboard].astro  # dashboard21〜dashboard100
│   │   └── calender/
│   │       └── index.astro    # カレンダーページ
│   └── styles/
│       ├── global.css         # メインのスタイルシート
│       ├── dashboard.css      # ダッシュボード用スタイル
│       └── dashboard-world.css # 追加ダッシュボード用スタイル
├── public/                    # 画像、フォント、その他の静的メディア
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages デプロイ
├── astro.config.mjs           # Astro設定
├── package.json               # npm scripts / dependencies
├── package-lock.json          # npm lockfile
└── README.md                  # プロジェクト概要・セットアップ手順
```

## 3. コンテンツ要件
以下の見出しを基に、OneThingに関する情報を展開します。

### 3.1 OneThingとは
- OneThingの概要およびコンセプトについて

### 3.2 OneThingの目的
- OneThingが目指すもの、提供する価値について

### 3.3 活動内容
- OneThingで実施される主な活動（イベント、プロジェクト、ワークショップ等）について

### 3.4 OneThingへの参加方法
- 参加手順、条件、申請方法などについて

### 3.5 運営体制
- OneThingの運営組織、役割分担、管理体制について

### 3.6 お問い合わせ
- 連絡先、問い合わせフォームなどの案内

### 3.7 ダッシュボード
- `/dashboard`から`/dashboard100`までの複数デザインでGoogle Calendarの公開ICSを参照し、今後のイベントを表示
- 静的サイトのため、GitHub Actionsで1時間ごとに再ビルドしてイベント情報を更新
- ページを開いたままでも1時間ごとにランダムで別デザインへ遷移
- 左下の`NEXT DESIGN`から手動でランダムに別デザインへ切り替え

## 4. HTML/CSSの要件
- **セマンティックマークアップ:** Astroコンポーネント内で`<header>`, `<nav>`, `<main>`, `<footer>`等のHTML5要素を使用
- **レスポンシブデザイン:** `<meta name="viewport" content="width=device-width, initial-scale=1">`を利用
- **アクセシビリティ:** alt属性、ARIA属性を適切に使用
- **カラーパレット:**  
  - **ライトモード:** 背景 #fff、文字色 #333  
  - **ダークモード:** 背景 #1f1f1f、文字色 #e0e0e0  
  CSSメディアクエリを利用して自動切替を実装

## 5. GitHub Pages特有の注意点
- GitHub PagesのSourceは`GitHub Actions`を利用
- `main`ブランチへのpushでAstroをビルドし、`dist/`相当の成果物を公開
- 公開ICSの更新を反映するため、GitHub Actionsを1時間ごとにも実行
- `dist/`は生成物としてリポジトリには含めない

## 6. 今後の拡張
- JavaScriptを利用したインタラクティブ機能の追加（例: `js/`ディレクトリの構成検討）
