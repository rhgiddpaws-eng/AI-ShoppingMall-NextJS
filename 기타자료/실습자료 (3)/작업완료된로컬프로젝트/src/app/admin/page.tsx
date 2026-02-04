"use client"

import { useState, useEffect } from "react"
import { Users, CreditCard, Package, ShoppingCart } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

import { DashboardCard } from "@/components/admin/dashboard-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboard() {
  const [period, setPeriod] = useState("month")
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/admin/dashboard")
        if (!response.ok) {
          throw new Error("데이터를 불러오는데 실패했습니다")
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error("대시보드 데이터 로딩 오류:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">데이터를 불러올 수 없습니다</h2>
        <p className="text-muted-foreground mt-2">잠시 후 다시 시도해주세요.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <DashboardCard
          title="총 사용자"
          value={`${dashboardData.stats.totalUsers.toLocaleString()}명`}
          description={`이번 달 신규 가입: ${dashboardData.stats.newUsersThisMonth}명`}
          icon={<Users className="h-4 w-4" />}
          trend={dashboardData.trends.users}
        />
        <DashboardCard
          title="이번 달 매출"
          value={`${dashboardData.stats.monthlyRevenue.toLocaleString()}원`}
          description="전월 대비"
          icon={<CreditCard className="h-4 w-4" />}
          trend={dashboardData.trends.revenue}
        />
        <DashboardCard
          title="총 주문 건수"
          value={`${dashboardData.stats.totalOrders.toLocaleString()}건`}
          description={`이번 달: ${dashboardData.stats.ordersThisMonth}건`}
          icon={<ShoppingCart className="h-4 w-4" />}
          trend={dashboardData.trends.orders}
        />
        <DashboardCard
          title="재고 부족 상품"
          value={`${dashboardData.stats.lowStockProducts}개`}
          description="지난 주 대비"
          icon={<Package className="h-4 w-4" />}
          trend={dashboardData.trends.lowStock}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>매출 추이</CardTitle>
            <CardDescription>
              <Tabs defaultValue={period} onValueChange={setPeriod}>
                <TabsList>
                  <TabsTrigger value="week">주간</TabsTrigger>
                  <TabsTrigger value="month">월간</TabsTrigger>
                  <TabsTrigger value="year">연간</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}원`, "매출"]} />
                  <Bar dataKey="매출" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>주문 상태</CardTitle>
            <CardDescription>현재 주문 상태별 건수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-1">결제 대기</div>
                <div className="text-2xl font-bold">{dashboardData.orderStatus.pending}건</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-1">결제 완료</div>
                <div className="text-2xl font-bold">{dashboardData.orderStatus.confirmed}건</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-1">배송 중</div>
                <div className="text-2xl font-bold">{dashboardData.orderStatus.shipping}건</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-1">배송 완료</div>
                <div className="text-2xl font-bold">{dashboardData.orderStatus.delivered}건</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">환불/취소 요청</div>
                <Badge variant="destructive">{dashboardData.orderStatus.refundRequests}건</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">교환 요청</div>
                <Badge variant="secondary">{dashboardData.orderStatus.exchangeRequests}건</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 주문</CardTitle>
              <CardDescription>최근 5개 주문</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              모두 보기
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer} • {order.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        order.status === "배송 완료"
                          ? "default"
                          : order.status === "배송 중"
                            ? "secondary"
                            : order.status === "결제 완료"
                              ? "outline"
                              : "destructive"
                      }
                    >
                      {order.status}
                    </Badge>
                    <div className="font-medium">{order.amount.toLocaleString()}원</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>재고 부족 상품</CardTitle>
              <CardDescription>재고가 5개 이하인 상품</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              모두 보기
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.lowStockProducts.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.category} • {product.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.stock <= 3 ? "destructive" : "outline"}>재고: {product.stock}개</Badge>
                    <Button size="sm" variant="ghost">
                      <Package className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

