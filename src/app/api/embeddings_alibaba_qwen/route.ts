// =============================================================================
// 알리바바 Qwen 임베딩 API - POST /api/embeddings_alibaba_qwen
// body: text → 외부 임베딩 서버(gte-Qwen2) 호출 후 벡터 반환
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  const { text } = await request.json()

  const embeddingServerUrl = 'http://localhost:7997/embeddings'

  const response = await axios.post(embeddingServerUrl, {
    model: 'Alibaba-NLP/gte-Qwen2-1.5B-instruct',
    input: [text],
    modality: 'text',
  })
  const embedding = response.data

  return NextResponse.json({
    embedding,
  })
}
