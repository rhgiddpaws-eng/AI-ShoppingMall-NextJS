'use client'
// =============================================================================
// 문의하기 페이지 - /support
// 주문 연동 선택(orderId 쿼리), 문의 내용 + 이미지/동영상 첨부 업로드 (S3 inquiries)
// =============================================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

const ACCEPT_FILES =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime'

export default function SupportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  const orderId = orderIdParam ? Number(orderIdParam) : undefined

  const { user, isHydrated } = useAuthStore()
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  useEffect(() => {
    if (isHydrated && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/support' + (orderId ? `?orderId=${orderId}` : ''))}`)
    }
  }, [user, isHydrated, router, orderId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadOneFile = async (file: File): Promise<string> => {
    const res = await fetch('/api/user/inquiries/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fileType: file.type }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '업로드 URL 발급 실패')
    }
    const { uploadUrl, key } = await res.json()
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!putRes.ok) throw new Error('파일 업로드 실패')
    return key
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error('문의 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setUploadProgress('첨부 파일 업로드 중...')

    try {
      const keys: string[] = []
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`업로드 중 (${i + 1}/${files.length})...`)
        const key = await uploadOneFile(files[i])
        keys.push(key)
      }
      setUploadProgress('문의 접수 중...')

      const res = await fetch('/api/user/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          orderId: orderId ?? undefined,
          attachmentKeys: keys,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || '문의 접수에 실패했습니다')
      }

      toast.success('문의가 접수되었습니다.')
      setMessage('')
      setFiles([])
      router.push('/account')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '문의 접수에 실패했습니다')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  if (!isHydrated || !user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href={orderId ? '/account?tab=orders' : '/account'}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">이전</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">문의하기</h1>
      </div>

      {orderId && (
        <p className="text-sm text-muted-foreground mb-4">
          주문 #{orderId} 관련 문의입니다.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>문의 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="message">내용 *</Label>
              <Textarea
                id="message"
                placeholder="문의하실 내용을 입력해주세요."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label>이미지 / 동영상 첨부 (선택)</Label>
              <p className="text-xs text-muted-foreground">
                이미지: JPG, PNG, GIF, WEBP / 동영상: MP4, WEBM, MOV
              </p>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  <input
                    type="file"
                    accept={ACCEPT_FILES}
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                  <Upload className="h-4 w-4 mr-2" />
                  파일 선택
                </label>
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFile(i)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadProgress}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    접수 중...
                  </>
                ) : (
                  '문의 접수'
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/account">취소</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
