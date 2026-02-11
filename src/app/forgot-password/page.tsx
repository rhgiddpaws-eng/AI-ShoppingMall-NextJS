'use client'
// =============================================================================
// 비밀번호 찾기 - /forgot-password
// 이메일 입력 후 재설정 링크 발급 (개발 시 링크 표시, 운영 시 이메일 발송 연동)
// =============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devResetLink, setDevResetLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }
    setLoading(true)
    setDevResetLink(null)
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? '요청 처리에 실패했습니다.')
        return
      }
      setSent(true)
      toast.success(data?.message ?? '재설정 링크를 발송했습니다.')
      if (data.devResetLink) {
        setDevResetLink(data.devResetLink)
      }
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/login">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">로그인으로</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">이메일 발송 완료</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          해당 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해주세요.
        </p>
        {devResetLink && (
          <div className="rounded-lg border bg-muted/50 p-4 text-sm break-all">
            <p className="font-medium mb-2">개발 모드: 아래 링크로 비밀번호를 재설정할 수 있습니다.</p>
            <a href={devResetLink} className="text-primary hover:underline">
              {devResetLink}
            </a>
          </div>
        )}
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/login">로그인으로 돌아가기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/login">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">로그인으로</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">비밀번호 찾기</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              처리 중...
            </>
          ) : (
            '재설정 링크 받기'
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
