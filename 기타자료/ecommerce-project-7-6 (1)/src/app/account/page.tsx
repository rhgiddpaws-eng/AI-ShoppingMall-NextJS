'use client'

import type React from 'react'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

export default function AccountPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically make an API call to update the user's profile
    // For now, we'll just show a toast message
    toast.success('프로필이 성공적으로 업데이트되었습니다.')
  }

  const handleLogout = () => {
    logout()
    router.push('/')
    toast.success('성공적으로 로그아웃되었습니다.')
  }

  if (!user) {
    return null // or you could return a loading state here
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">홈으로</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">내 계정</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">프로필</TabsTrigger>
          <TabsTrigger value="orders">주문 내역</TabsTrigger>
          <TabsTrigger value="payments">결제 정보</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit">프로필 업데이트</Button>
          </form>
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <h2 className="text-xl font-semibold mb-4">주문 내역</h2>
          <p className="text-muted-foreground">아직 주문 내역이 없습니다.</p>
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <h2 className="text-xl font-semibold mb-4">결제 정보</h2>
          <p className="text-muted-foreground">저장된 결제 정보가 없습니다.</p>
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <h2 className="text-xl font-semibold mb-4">계정 설정</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notifications">알림 설정</Label>
              <div className="mt-2">
                <p className="text-muted-foreground">
                  알림 설정 옵션을 준비 중입니다.
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="privacy">개인정보 설정</Label>
              <div className="mt-2">
                <p className="text-muted-foreground">
                  개인정보 설정 옵션을 준비 중입니다.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12">
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}
