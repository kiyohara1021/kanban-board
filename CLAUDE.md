# CLAUDE.md

このリポジトリの説明とルールは AGENTS.md にまとめている。Claude Code はここで読み込む。

@AGENTS.md

## Claude Code 向けの補足

- `.claude/settings.json` は、このリポジトリを Claude Code で開いた全員に効く。全員で揃えたい設定だけを置き、個人の好み（コミットの帰属表示など）は `.claude/settings.local.json`（Git の対象外）に書く
- 画面を変えたら、`npm run dev` で起動してブラウザで動作を確かめてから終える。確認用にデータを変えたときは、最後に `npm run db:seed -w backend` でサンプルの状態に戻す
- テストで見つからない不具合（キーボード操作、フォーカス、日本語入力など）は、ブラウザで実際に操作して確かめる
