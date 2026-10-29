// .env がなくても動くよう、初期値をここで決める
export const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
// PORT はほかのツールも使う汎用の名前でぶつかりやすいので、専用の API_PORT にする
export const API_PORT = Number(process.env.API_PORT ?? 3000)
