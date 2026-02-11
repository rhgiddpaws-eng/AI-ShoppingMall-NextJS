'use client'
// =============================================================================
// 문의 내용 표시: 맨 위 첨부(이미지/동영상) → 그 아래 문의 내용 → 관리자 답변
// =============================================================================

import Image from 'next/image'
import { getCdnUrl } from '@/lib/cdn'

function isVideoKey(key: string): boolean {
  const lower = key.toLowerCase()
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')
}

interface InquiryContentProps {
  attachmentKeys: string[]
  message: string
  replyMessage?: string | null
  repliedAt?: Date | string | null
  showReplyLabel?: boolean
}

export function InquiryContent({
  attachmentKeys,
  message,
  replyMessage,
  repliedAt,
  showReplyLabel = true,
}: InquiryContentProps) {
  return (
    <div className="space-y-6">
      {/* 1. 맨 위: 업로드한 이미지/동영상 */}
      {attachmentKeys.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">첨부 파일</h4>
          <div className="flex flex-wrap gap-3">
            {attachmentKeys.map((key) => {
              const url = getCdnUrl(key)
              if (isVideoKey(key)) {
                return (
                  <div key={key} className="rounded-lg overflow-hidden border bg-muted">
                    <video
                      src={url}
                      controls
                      className="max-h-64 w-auto max-w-full"
                      preload="metadata"
                    />
                  </div>
                )
              }
              return (
                <div
                  key={key}
                  className="relative h-40 w-40 rounded-lg overflow-hidden border bg-muted shrink-0"
                >
                  <Image
                    src={url}
                    alt="첨부 이미지"
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. 문의 내용 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">문의 내용</h4>
        <div className="rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm">
          {message}
        </div>
      </div>

      {/* 3. 관리자 답변 */}
      {replyMessage != null && replyMessage !== '' && (
        <div className="space-y-2">
          {showReplyLabel && (
            <h4 className="text-sm font-medium text-muted-foreground">
              관리자 답변
              {repliedAt && (
                <span className="ml-2 text-xs font-normal">
                  ({typeof repliedAt === 'string' ? new Date(repliedAt).toLocaleString('ko-KR') : repliedAt.toLocaleString('ko-KR')})
                </span>
              )}
            </h4>
          )}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 whitespace-pre-wrap text-sm">
            {replyMessage}
          </div>
        </div>
      )}
    </div>
  )
}
