# コントリビューションガイド

不具合の報告、教材の説明の改善、テストの追加を歓迎します。

## 始める前に

- 新しい Issue を作る前に、既存の Issue を検索してください。
- 大きな機能追加や設計の変更は、実装の前に Issue で相談してください。教材として段階を追って読めることを優先します。
- 脆弱性は公開 Issue ではなく、[SECURITY.md](SECURITY.md) の手順で報告してください。

## 開発環境

Node.js のバージョンは `.nvmrc` に合わせてください（`nvm use`）。

```bash
npm install
npm run dev
```

## PR を出す前に

次のコマンドがすべて成功することを確認してください。CI でも同じ検査を行います。

```bash
npm run format:check
npm run lint
npm test
npm run build
```

画面の見た目を変えた場合は、変更前後のスクリーンショットを PR に添付してください。
