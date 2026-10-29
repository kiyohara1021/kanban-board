import 'dotenv/config'
import { app } from './app'
import { API_PORT } from './config'

app.listen(API_PORT, () => {
  console.log(`API server: http://localhost:${API_PORT}`)
})
