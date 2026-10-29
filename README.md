# かんばんボード（React 学習用）

Trello のようなかんばんボードを作りながら React を学ぶプロジェクト。

## 技術スタック

| 分類           | 採用技術                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| フロントエンド | Vite / React 19 / TypeScript / Tailwind CSS / shadcn/ui / React Router / TanStack Query / dnd-kit |
| バックエンド   | Node.js / Express 5 / TypeScript / Prisma 7 / SQLite（libsql アダプター）                         |
| 共通           | Zod（バリデーションと型をフロント・バックで共有）                                                 |
| テスト         | Vitest / React Testing Library / Supertest                                                        |
| 品質管理       | oxlint / Prettier / GitHub Actions / Dependabot                                                   |
| パッケージ管理 | npm workspaces                                                                                    |

## 起動方法

Node.js 24 以上が必要。推奨は最新の LTS である 26（`.nvmrc` に書いてある）。nvm や fnm を使っている場合は、`nvm use` などで切り替えられる。

```bash
npm install
npm run db:migrate -w backend
npm run db:seed -w backend
npm run dev
```

- `npm run db:migrate -w backend` は初回だけ実行する。SQLite のデータベース（`backend/prisma/dev.db`）が作られる
- `npm run db:seed -w backend` でサンプルのボードを入れる。実行するたびに、DB の中身がサンプルの状態に戻る
- `npm run dev` でフロントエンドとバックエンドが同時に起動する。http://localhost:5173 を開く

| コマンド                       | 内容                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `npm test`                     | 3つのパッケージのテスト（Vitest。backend は Supertest で API を試す） |
| `npm run build`                | フロントのビルドと、3つのパッケージの型チェック                       |
| `npm run lint`                 | lint（oxlint）                                                        |
| `npm run format`               | 整形（Prettier）                                                      |
| `npm run format:check`         | 整形されているかの確認（CI で使う）                                   |
| `npm run db:studio -w backend` | ブラウザで DB の中身を見る（Prisma Studio）                           |

## ディレクトリ構成

```
kanban-board/
├── .github/       CI、Issue / PR テンプレート、Dependabot、Copilot 向けの説明
├── docs/          設計ドキュメント
├── frontend/      React アプリ（Vite の react-ts テンプレートから作成）
├── backend/       API サーバー（Prisma 公式の Express テンプレートから作成）
├── shared/        フロントとバックで共有する Zod スキーマ・型・並び順の計算（@kanban/shared）
├── AGENTS.md      AI エージェント向けの説明（構成、コマンド、守ってほしいルール）
├── CLAUDE.md      Claude Code 向け（AGENTS.md を読み込み、補足を足す）
└── package.json   npm workspaces のルート
```

AI エージェント（Claude Code、Codex、Cursor、GitHub Copilot など）に作業させるときの説明は、[AGENTS.md](AGENTS.md) にまとめている。

## テンプレートから作ったもの

自分で書く必要のない部分は、公式のテンプレートや生成ツールを使っている。

| 対象                          | 使ったもの                                                                                                                      | 自分で変えたところ                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `frontend/`                   | `npm create vite`（react-ts）                                                                                                   | サンプル画面の削除、Tailwind・パスエイリアス        |
| `frontend/src/components/ui/` | `npx shadcn add`（button, dialog, alert-dialog, input, textarea, label）                                                        | 閉じるボタンの読み上げを日本語に変更                |
| `backend/`                    | `npx try-prisma --template orm/express`（[prisma-examples](https://github.com/prisma/prisma-examples/tree/latest/orm/express)） | PostgreSQL から SQLite に変更、構成を設計に合わせた |

shadcn の部品を追加するときは `frontend/` で `npx shadcn@latest add <部品名>` を実行する。

## 設計ドキュメント

1. [要件・画面](docs/01-requirements.md)
2. [データモデル](docs/02-data-model.md)
3. [API 設計](docs/03-api.md)
4. [フロントエンド設計](docs/04-frontend.md)
5. [バックエンド設計](docs/05-backend.md)

## 開発ステップ

React の学習に集中するため、最初はフロントエンドだけで作り、後からAPIとつなぐ。

| Step | 内容                              | 主に学ぶこと                                                                      |
| ---- | --------------------------------- | --------------------------------------------------------------------------------- |
| 1    | 固定データでボードを表示する      | コンポーネント分割、props、リスト描画と `key`                                     |
| 2    | カード・カラムの追加・編集・削除  | `useState` / `useReducer`、イミュータブルな更新、フォーム                         |
| 3    | ドラッグ&ドロップで並び替え・移動 | dnd-kit、イベント処理、ネストした状態の更新                                       |
| 4    | バックエンド API を作る           | Express、Prisma、Zod によるバリデーション                                         |
| 5    | フロントと API をつなぐ           | TanStack Query、ローディング・エラー表示、楽観的更新                              |
| 6    | ボード一覧とルーティング          | React Router（子ルート）、URL で状態を表す、画面のテスト（React Testing Library） |

Step 6 までで、[要件](docs/01-requirements.md)の MVP（ボード・カラム・カードの作成・編集・削除・並び替え）がそろった。

### 今後の候補

[要件](docs/01-requirements.md)の「MVP の後に追加する候補」から選んで進める。

- ラベル（色付きタグ）
- 期限日と、期限切れの強調表示
- カードの検索・絞り込み
- ログインと複数ユーザー対応
- リアルタイム同期（WebSocket）

## 学習者向けの進め方

各 Step が終わった時点に、タグを付けている。好きな Step の終わりから始めて、次の Step を自分で作り、完成形と見比べられる。

| タグ     | その時点の状態                                                | 次に自分で作るもの               |
| -------- | ------------------------------------------------------------- | -------------------------------- |
| `step-2` | 固定データのボードで、カード・カラムを追加・編集・削除できる  | Step 3：ドラッグ&ドロップ        |
| `step-3` | ドラッグ&ドロップで並び替えられる（データはまだ保存されない） | Step 4：バックエンド API         |
| `step-4` | API と DB ができている（画面はまだ固定データ）                | Step 5：画面と API をつなぐ      |
| `step-5` | 画面の操作がサーバーに保存される（ボードは1つ目だけを表示）   | Step 6：ボード一覧とルーティング |
| `step-6` | MVP 完成                                                      | 「今後の候補」から選ぶ           |

Step 1 は Step 2 と同じコミットに入っているため、タグは `step-2` から始まる。Step 1 から自分で作りたいときは、[設計ドキュメント](#設計ドキュメント)を読みながら新しいプロジェクトで作ってみる。

### 例：Step 3 を自分で作る

```bash
git clone https://github.com/kiyohara1021/kanban-board.git
cd kanban-board

# step-2 の状態から、自分用のブランチを作る
git switch -c my-step3 step-2
npm install
npm run dev
```

詰まったら、完成形と見比べる。

```bash
# Step 2 から Step 3 で変わったファイルの一覧
git diff --stat step-2 step-3

# 特定のファイルの変更
git diff step-2 step-3 -- frontend/src/pages/BoardPage.tsx

# 完成形のファイルを、今のブランチを変えずに見る
git show step-3:frontend/src/features/boards/useBoardDnd.ts
```

### 注意

- タグによって使っているライブラリが違うので、切り替えたら `npm install` をやり直す
- `step-4` 以降は DB を使う。最初に `npm run db:migrate -w backend` と `npm run db:seed -w backend` を実行する
- 各 Step のコミットメッセージと[設計ドキュメント](#設計ドキュメント)に、その Step で決めたことやつまずいた点を書いてある

## ライセンス

[MIT](LICENSE)

## 参考

- [kawamou/kanban-board](https://github.com/kawamou/kanban-board)：コンポーネントの分け方、カスタムフックへの切り出し方
- [braiekhazem/react-kanban-kit](https://github.com/braiekhazem/react-kanban-kit)：ID をキーにした平らなデータ構造（[フロントエンド設計](docs/04-frontend.md#別案正規化した状態)を参照）
