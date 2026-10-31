/**
 * 期限日（"2026-11-05"）を画面に出す形にする。今年なら「11月5日」、ほかの年なら「2027年1月5日」。
 * 今日の日付を引数で受け取るので、いつ実行しても同じ結果になり、テストしやすい
 */
export function formatDueDate(dueDate: string, today: string): string {
  // new Date("2026-11-05") は UTC の0時として読まれ、タイムゾーンによっては前の日になるので、文字列のまま分ける
  const [year, month, day] = dueDate.split('-').map(Number)
  const thisYear = Number(today.split('-')[0])
  const monthDay = `${month}月${day}日`
  return year === thisYear ? monthDay : `${year}年${monthDay}`
}
