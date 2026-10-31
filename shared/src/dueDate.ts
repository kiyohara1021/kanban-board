// 期限日（"2026-11-05" のような日付だけの文字列）の計算。docs/02-data-model.md の「期限日の持ち方」を参照
// フロントエンド（期限切れの表示）と、サンプルデータ（seed とデモ版）の両方で使う

/**
 * Date を、その環境のタイムゾーンでの "YYYY-MM-DD" に変える。
 * toISOString() は UTC の日付になるので使わない（日本時間の朝9時より前は前の日になってしまう）
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 期限切れかどうか。期限日が今日より前なら期限切れで、今日が期限の日はまだ期限切れにしない。
 * 今日の日付を引数で受け取るので、いつ実行しても同じ結果になり、テストしやすい
 */
export function isOverdue(dueDate: string | null, today: string): boolean {
  if (dueDate === null) return false
  // "YYYY-MM-DD" は桁数がそろっているので、文字列の大小で日付の前後を比べられる
  return dueDate < today
}
