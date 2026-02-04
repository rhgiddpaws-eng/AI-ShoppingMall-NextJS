'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  UserCog,
  Mail,
  Phone,
  Calendar,
  Shield,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
interface Order {
  id: string
  date: string
  total: number
  status: string
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  joinDate: string
  lastLogin: string
  status: string
  role: string
  address: string
  orders: Order[]
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`/api/admin/users/${id}`)
        if (!response.ok) {
          throw new Error('사용자 데이터를 불러오는데 실패했습니다')
        }
        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error('사용자 데이터 로딩 오류:', error)
        toast.error('사용자 정보를 불러올 수 없습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [id, toast])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })

      if (!response.ok) {
        throw new Error('사용자 정보 업데이트에 실패했습니다')
      }

      toast.success('사용자 정보가 성공적으로 업데이트되었습니다.')
    } catch (error) {
      console.error('사용자 정보 업데이트 오류:', error)
      toast.error('사용자 정보 업데이트에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">뒤로 가기</span>
        </Button>
        <h1 className="text-2xl font-bold mb-4">사용자를 찾을 수 없습니다</h1>
        <p>요청하신 사용자 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">뒤로 가기</span>
          </Button>
          <h1 className="text-2xl font-bold">사용자 정보</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '저장 중...' : '변경사항 저장'}
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">프로필</TabsTrigger>
          <TabsTrigger value="orders">주문 내역</TabsTrigger>
          <TabsTrigger value="security">보안 및 권한</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={user.name}
                    onChange={e => setUser({ ...user, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user.email}
                      onChange={e =>
                        setUser({ ...user, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={user.phone}
                      onChange={e =>
                        setUser({ ...user, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">사용자 ID</div>
                  </div>
                  <div>{user.id}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">가입일</div>
                  </div>
                  <div>{user.joinDate}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">최근 로그인</div>
                  </div>
                  <div>{user.lastLogin}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">계정 상태</div>
                  </div>
                  <Badge
                    variant={user.status === '활성' ? 'default' : 'secondary'}
                  >
                    {user.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>배송지 주소</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={user.address}
                    onChange={e =>
                      setUser({ ...user, address: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>주문 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {user.orders && user.orders.length > 0 ? (
                <div className="space-y-4">
                  {user.orders.map(order => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b pb-4"
                    >
                      <div>
                        <div className="font-medium">{order.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.date}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge
                          variant={
                            order.status === '배송 완료'
                              ? 'default'
                              : order.status === '배송 중'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {order.status}
                        </Badge>
                        <div className="font-medium">
                          {order.total.toLocaleString()}원
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            상세 보기
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  주문 내역이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>권한 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">사용자 권한</Label>
                  <Select
                    value={user.role}
                    onValueChange={value => setUser({ ...user, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="권한 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="사용자">일반 사용자</SelectItem>
                      <SelectItem value="관리자">관리자</SelectItem>
                      <SelectItem value="슈퍼관리자">슈퍼관리자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>계정 상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">계정 활성화</div>
                    <div className="text-sm text-muted-foreground">
                      사용자 계정의 활성화 상태를 변경합니다.
                    </div>
                  </div>
                  <Switch
                    checked={user.status === '활성'}
                    onCheckedChange={checked =>
                      setUser({ ...user, status: checked ? '활성' : '비활성' })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">이메일 인증 완료</div>
                    <div className="text-sm text-muted-foreground">
                      사용자의 이메일 인증 상태를 변경합니다.
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>보안 조치</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">비밀번호 초기화</div>
                    <div className="text-sm text-muted-foreground">
                      사용자의 비밀번호를 초기화하고 이메일로 재설정 링크를
                      발송합니다.
                    </div>
                  </div>
                  <Button variant="outline">비밀번호 초기화</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">계정 잠금 해제</div>
                    <div className="text-sm text-muted-foreground">
                      로그인 시도 실패로 잠긴 계정을 해제합니다.
                    </div>
                  </div>
                  <Button variant="outline">잠금 해제</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-destructive">
                      계정 삭제
                    </div>
                    <div className="text-sm text-muted-foreground">
                      사용자 계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수
                      없습니다.
                    </div>
                  </div>
                  <Button variant="destructive">계정 삭제</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
