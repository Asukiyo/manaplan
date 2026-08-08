# Campus Quest

履修検索・時間割作成・卒業要件の確認・ChatBot・学期末ボス戦をまとめた、RPG風の履修サポートアプリです。

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
終了するときは PowerShell で `Ctrl + C` を押します。

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
