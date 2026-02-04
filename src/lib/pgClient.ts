import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

const pool =
  global.pgPool ||
  new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: parseInt(process.env.PG_PORT || '7432'),
    max: 5,
  })

if (process.env.NODE_ENV === 'development') global.pgPool = pool

export default pool
