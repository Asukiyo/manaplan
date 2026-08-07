# まなプラン RPG

履修検索・時間割作成・卒業要件の確認・ChatBot・学期末ボス戦をまとめた、RPG風の履修サポートアプリです。

このリポジトリはハッカソン審査向けのローカル実行版です。ChatGPT Sites / `chatgpt.site`、Cloudflare、Wrangler などのホスティング環境には依存しません。

## 動作環境

- Windows 10 / 11
- Node.js 22.13.0 以上（Node.js 22 LTS 推奨）
- npm（Node.js に同梱）

## Windows PowerShell で起動

リポジトリを clone したフォルダで次を実行してください。

```powershell
npm ci
npm run dev
```

起動後、ブラウザで以下を開きます。

<http://localhost:3000>

終了するときは PowerShell で `Ctrl + C` を押します。

## 本番ビルドの確認

```powershell
npm run build
npm run start
```

## 主な機能

- 学年・コース・学期に応じた履修支援
- 授業検索と時間割への登録
- 卒業要件・残り単位数の確認
- 事前に用意した履修相談ChatBot
- GPA・修得単位を使ったRPG風の学期末ボス戦
- キャンパスマップ表示

## データと保存

- 授業・シラバス情報はリポジトリ内のデータを参照します。
- 入力した進捗はブラウザの `localStorage` に保存されます。
- APIキーや外部データベースは不要です。

## Public リポジトリに含めないもの

`node_modules/`、`.next/`、`.env*` は `.gitignore` の対象です。依存パッケージは各環境で `npm ci` により復元してください。
