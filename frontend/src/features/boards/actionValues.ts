// アクションに入れる ID と日時は、reducer の外（イベントハンドラー）で作る。
// 楽観的更新で画面に先に出すための仮の値で、保存に成功したあとサーバーのデータに置き換わる
export const newId = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
