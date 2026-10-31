# 03. API 設計

## 共通ルール

- ベース URL：`http://localhost:3000/api`
- リクエストとレスポンスは JSON
- 日時は ISO 8601 形式の文字列（例：`"2026-10-30T09:00:00.000Z"`）
- `PATCH` は部分更新。送った項目だけを変更する
- リクエストボディは、フロントとバックで共有する Zod スキーマで検証する

### ステータスコード

| コード                    | 使う場面                   |
| ------------------------- | -------------------------- |
| 200 OK                    | 取得・更新に成功           |
| 201 Created               | 作成に成功                 |
| 204 No Content            | 削除に成功（ボディなし）   |
| 400 Bad Request           | 入力値が不正               |
| 404 Not Found             | 指定した ID のデータがない |
| 500 Internal Server Error | 想定外のエラー             |

### エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [{ "path": "title", "message": "1文字以上で入力してください" }]
  }
}
```

`code` は `VALIDATION_ERROR` / `NOT_FOUND` / `INTERNAL_ERROR` のいずれか。`details` は入力エラーのときだけ返す。

## エンドポイント一覧

| メソッド | パス                       | 内容                                       |
| -------- | -------------------------- | ------------------------------------------ |
| GET      | `/boards`                  | ボード一覧                                 |
| POST     | `/boards`                  | ボード作成                                 |
| GET      | `/boards/:boardId`         | ボード詳細（カラム・カード・ラベルを含む） |
| PATCH    | `/boards/:boardId`         | ボード更新                                 |
| DELETE   | `/boards/:boardId`         | ボード削除                                 |
| POST     | `/boards/:boardId/columns` | カラム追加                                 |
| PATCH    | `/columns/:columnId`       | カラム更新                                 |
| POST     | `/columns/:columnId/move`  | カラムの並び替え                           |
| DELETE   | `/columns/:columnId`       | カラム削除                                 |
| POST     | `/columns/:columnId/cards` | カード追加                                 |
| GET      | `/cards/:cardId`           | カード取得                                 |
| PATCH    | `/cards/:cardId`           | カード更新                                 |
| POST     | `/cards/:cardId/move`      | カードの並び替え・カラム間の移動           |
| DELETE   | `/cards/:cardId`           | カード削除                                 |
| POST     | `/boards/:boardId/labels`  | ラベル作成                                 |
| DELETE   | `/labels/:labelId`         | ラベル削除                                 |

親子関係のある作成（カラム追加、カード追加）は親の ID をパスに入れる。作成後の操作は、子の ID だけで指定できるようにする。

---

## 型定義

`shared/` に Zod スキーマとして定義し、`z.infer` で型を作る。

```ts
type Board = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

type Column = {
  id: string
  boardId: string
  title: string
  position: number
  createdAt: string
  updatedAt: string
}

type Card = {
  id: string
  columnId: string
  title: string
  description: string
  position: number
  labelIds: string[] // 付いているラベルの ID
  createdAt: string
  updatedAt: string
}

type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue'

type Label = {
  id: string
  boardId: string
  name: string
  color: LabelColor
  createdAt: string
  updatedAt: string
}

// GET /boards/:boardId のレスポンス
type BoardDetail = Board & {
  columns: (Column & { cards: Card[] })[]
  labels: Label[]
}
```

カードには、ラベルの中身ではなく ID の配列（`labelIds`）だけを入れる。ラベルの名前や色はボード詳細の `labels` に1回だけ入れ、画面では ID から引く。同じラベルを付けたカードが何枚あっても、名前や色を何度も送らずに済み、ラベルを消したときも `labels` から消すだけで済む。

---

## ボード

### GET /boards

ボード一覧を、作成日時が新しい順に返す。

```json
// 200
[{ "id": "b1", "title": "個人タスク", "createdAt": "...", "updatedAt": "..." }]
```

### POST /boards

```json
// リクエスト
{ "title": "個人タスク" }

// 201
{ "id": "b1", "title": "個人タスク", "createdAt": "...", "updatedAt": "..." }
```

作成時に「ToDo」「進行中」「完了」の3カラムを自動で作る。

### GET /boards/:boardId

ボード画面を1回のリクエストで描画できるよう、カラム・カード・ラベルをまとめて返す。カラムとカードは `position` の昇順、ラベルは作成した順に並べる。

```json
// 200
{
  "id": "b1",
  "title": "個人タスク",
  "createdAt": "...",
  "updatedAt": "...",
  "columns": [
    {
      "id": "c1",
      "boardId": "b1",
      "title": "ToDo",
      "position": 1000,
      "createdAt": "...",
      "updatedAt": "...",
      "cards": [
        {
          "id": "k1",
          "columnId": "c1",
          "title": "React の公式チュートリアルを読む",
          "description": "",
          "position": 1000,
          "labelIds": ["l1"],
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  ],
  "labels": [
    {
      "id": "l1",
      "boardId": "b1",
      "name": "学習",
      "color": "blue",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### PATCH /boards/:boardId

```json
// リクエスト
{ "title": "仕事のタスク" }

// 200：更新後の Board
```

### DELETE /boards/:boardId

204。配下のカラム・カード・ラベルも削除する。

---

## カラム

### POST /boards/:boardId/columns

末尾に追加する。

```json
// リクエスト
{ "title": "レビュー待ち" }

// 201：作成した Column
```

### PATCH /columns/:columnId

```json
// リクエスト
{ "title": "確認中" }

// 200：更新後の Column
```

### POST /columns/:columnId/move

ボード内でカラムの順番を変える。`index` は移動後の位置（0始まり）。

```json
// リクエスト
{ "index": 0 }

// 200：更新後の Column（新しい position を含む）
```

### DELETE /columns/:columnId

204。配下のカードも削除する。

---

## カード

### POST /columns/:columnId/cards

カラムの末尾に追加する。

```json
// リクエスト
{ "title": "API を設計する", "description": "" }

// 201：作成した Card
```

`description` は省略でき、省略した場合は空文字になる。

### GET /cards/:cardId

200：Card。カード詳細モーダルを URL から直接開いたときに使う。

### PATCH /cards/:cardId

```json
// リクエスト（どれか1つだけでもよい）
{ "title": "API を設計する", "description": "エンドポイント一覧を作る", "labelIds": ["l1", "l2"] }

// 200：更新後の Card
```

- `labelIds` を送ると、カードに付いているラベルを、送った ID の組に置き換える（足したり外したりするのではなく、付けた後の状態を送る）。`[]` を送るとすべて外す。同じ ID が重なっていたら1つにまとめる
- `labelIds` には、カードと同じボードのラベルだけを指定できる。ほかのボードのラベルや、存在しない ID が含まれていたら 400 を返す（`details` の `path` は `labelIds`）

### POST /cards/:cardId/move

同じカラム内での並び替えと、別カラムへの移動の両方に使う。

```json
// リクエスト
{ "columnId": "c2", "index": 1 }

// 200：更新後の Card（新しい columnId と position を含む）
```

- `columnId`：移動先のカラム。同じカラム内で並び替えるときは、今のカラムの ID を送る
- `index`：移動先カラムでの位置（0始まり）。**移動するカード自身を除いた並び**で数える
- サーバーは移動先の `index - 1` 番目と `index` 番目のカードから position を計算する（[データモデル](02-data-model.md#並び順positionの持ち方)を参照）
- `columnId` は、移動元と同じボードのカラムでなければ 400 を返す

### DELETE /cards/:cardId

204

---

## ラベル

### POST /boards/:boardId/labels

```json
// リクエスト
{ "name": "学習", "color": "blue" }

// 201：作成した Label
```

- `color` は `green` / `yellow` / `orange` / `red` / `purple` / `blue` のどれか（[データモデル](02-data-model.md#項目ごとのルール)を参照）
- 同じ名前のラベルを作ってもよい（色違いで同じ名前を使う場合もあるため）

### DELETE /labels/:labelId

204。付けていたカードからも外れる。
