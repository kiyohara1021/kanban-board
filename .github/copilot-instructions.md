# GitHub Copilot 向けの説明

React を学ぶためのかんばんボード。詳しい説明とルールはリポジトリ直下の `AGENTS.md`、設計は `docs/` にある。ここでは、コードを書くときに特に守ってほしいことだけをまとめる。

## 構成

- npm workspaces のモノレポ：`frontend/`（Vite + React 19 + TanStack Query + React Router v8 + dnd-kit + shadcn/ui）、`backend/`（Express 5 + Prisma 7 + SQLite）、`shared/`（`@kanban/shared`：Zod スキーマ・型・並び順の計算）
- 学習者が読むコードなので、短さより読みやすさを優先する。コメントとドキュメントは日本語で、「なぜそうするか」を書く

## コードを書くときのルール

- 検証ルール・型・文字数制限は `shared/src/schemas.ts` だけに書き、フロントとバックで共有する
- 並び順は `shared/src/position.ts` の `positionForInsert` で計算する
- フロントでボードを変える操作は、`boardReducer` のアクションとして表し、`useBoardAction` の `run(action)` で送る（楽観的更新）。reducer は純粋に保ち、ID と日時は `newId()` / `now()` で作ってアクションに入れる
- import は `@/`（`frontend/src`）と `@kanban/shared` を使う
- Provider とルートは `frontend/src/app/` に書く。ページ（`pages/`）はルートの `lazy` で読み込む。描画中のエラーはエラーバウンダリー（`components/ErrorFallback.tsx` で表示）で受け止める
- `frontend/src/components/ui/` は shadcn/ui の生成ファイルなので編集しない
- `<button>` には `type` を明示する。テキスト入力の Enter では `event.nativeEvent.isComposing` を確認する（日本語入力）
- バックエンドの `routes/` は検証とステータスコードだけ、DB の操作は `services/`。エラーは `HttpError` 系を throw し、`try/catch` で包まない（Express 5 がエラーハンドラーに渡す）
- 画面のテストは React Testing Library で、要素は role と表示される文字で探す

## 確認

変更後は `npm run format:check`、`npm run lint`、`npm test`、`npm run build` がすべて通ることを確かめる。
