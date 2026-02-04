import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import fetch from 'node-fetch'
import OpenAI from 'openai'
import pool from '@/lib/pgClient'
import pgvector from 'pgvector'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
async function main() {
  // ... you will write your Prisma Client queries here
  const productId = 20

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  })

  const text = product?.name as string
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })
  const embeddings = embedding.data[0].embedding

  const postEmb = pgvector.toSql(embeddings)

  var queryText = `
      WITH similar_products AS (
        SELECT 
          p.id, 
          p.name, 
          p.price, 
          1 - (p.vector <=> $1) as similarity
        FROM "Product" p
        WHERE p.id <> $2
        ORDER BY similarity DESC
        LIMIT 10
      )
      SELECT * FROM similar_products
      ORDER BY (similarity * 0.9) + (RANDOM() * 0.1) DESC
      LIMIT 4
    `
  var values = [postEmb, productId]
  const rank = await pool.query(queryText, values)
  console.log(rank.rows)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
