// =============================================================================
// 임베딩 API - POST /api/embeddings
// body: text → OpenAI text-embedding-3-small 임베딩 벡터 반환
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const { text } = await request.json()
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })

  console.log(embedding)

  return NextResponse.json(embedding)
}
