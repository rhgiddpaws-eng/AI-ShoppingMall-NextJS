"use client"
// =============================================================================
// 관리자 대시보드 - /admin
// 통계 카드(사용자/매출/주문/재고), 매출 추이 차트, 주문 상태, 최근 주문/재고 부족 상품
// =============================================================================

import { useState, useEffect, useRef } from "react"
import { Users, CreditCard, Package, ShoppingCart } from "lucide-react"
import { DashboardCard } from "@/components/admin/dashboard-card"
import { SalesChartUplot } from "@/components/admin/sales-chart-uplot"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/** 탭 값: 일(일별) / 월(월별) / 년(연별) — API period와 명시적 매핑 */
const TAB_TO_API_PERIOD = { 일: "week", 월: "month", 년: "year" } as const
const ALL_API_PERIODS = ["week", "month", "year"] as const
type TabPeriod = keyof typeof TAB_TO_API_PERIOD
type ApiPeriod = (typeof TAB_TO_API_PERIOD)[TabPeriod]

type DashboardData = {
  period: ApiPeriod
  stats: {
    totalUsers: number
    newUsersThisMonth: number
    monthlyRevenue: number
    totalOrders: number
    ordersThisMonth: number
    lowStockProducts: number
  }
  trends: {
    users: { value: number; isPositive: boolean }
    revenue: { value: number; isPositive: boolean }
    orders: { value: number; isPositive: boolean }
    lowStock: { value: number; isPositive: boolean }
  }
  salesData: Array<{ name: string; sales?: number; 매출?: number }>
  orderStatus: {
    pending: number
    confirmed: number
    shipping: number
    delivered: number
    refundRequests: number
    exchangeRequests: number
  }
  recentOrders: Array<{
    id: string
    customer: string
    date: string
    status: "결제 대기" | "결제 완료" | "배송 중" | "배송 완료"
    amount: number
  }>
  lowStockProducts: Array<{
    id: string
    name: string
    stock: number
    category: string
  }>
}

/** 관리자 대시보드: /api/admin/dashboard 데이터로 통계·차트·최근 주문·재고 부족 표시 */
export default function AdminDashboard() {
  const [tabPeriod, setTabPeriod] = useState<TabPeriod>("월")
  const apiPeriod = TAB_TO_API_PERIOD[tabPeriod]
  const [dashboardCache, setDashboardCache] = useState<Partial<Record<ApiPeriod, DashboardData>>>({})
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPeriodLoading, setIsPeriodLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const inFlightPeriodsRef = useRef<Set<ApiPeriod>>(new Set())

  useEffect(() => {
    const controllers: AbortController[] = []
    let cancelled = false
    setLoadError(null)

    const fetchDashboardData = async (targetPeriod: ApiPeriod, mode: "active" | "background") => {
      if (inFlightPeriodsRef.current.has(targetPeriod)) return
      if (dashboardCache[targetPeriod]) {
        if (targetPeriod === apiPeriod) {
          setDashboardData(dashboardCache[targetPeriod] ?? null)
          setLoading(false)
          setIsPeriodLoading(false)
        }
        return
      }

      const controller = new AbortController()
      controllers.push(controller)
      inFlightPeriodsRef.current.add(targetPeriod)

      // 첫 진입은 전체 로딩, 탭 전환은 부분 로딩으로 처리해 화면 깜빡임을 줄입니다.
      if (mode === "active") {
        if (dashboardData == null) {
          setLoading(true)
        } else {
          setIsPeriodLoading(true)
        }
      }

      try {
        const response = await fetch(`/api/admin/dashboard?period=${targetPeriod}`, {
          cache: "no-store",
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error("데이터를 불러오는데 실패했습니다")
        }
        const data = (await response.json()) as DashboardData
        if (cancelled) return
        setDashboardCache((prev) => ({ ...prev, [targetPeriod]: data }))
        if (targetPeriod === apiPeriod) {
          setDashboardData(data)
        }
      } catch (error) {
        // 탭 전환으로 인한 취소 에러는 정상 흐름이므로 무시합니다.
        if (error instanceof DOMException && error.name === "AbortError") return
        if (cancelled) return
        if (mode === "active") {
          console.error("대시보드 데이터 로딩 오류:", error)
          // 활성 탭 데이터 로딩이 실패하면 이전 탭 잔상이 남지 않도록 화면을 비웁니다.
          setDashboardData(null)
          setLoadError("대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
        }
      } finally {
        inFlightPeriodsRef.current.delete(targetPeriod)
        if (!cancelled && mode === "active") {
          setLoading(false)
          setIsPeriodLoading(false)
        }
      }
    }

    const run = async () => {
      const selectedData = dashboardCache[apiPeriod]
      if (selectedData) {
        setDashboardData(selectedData)
        setLoading(false)
        setIsPeriodLoading(false)
      } else {
        await fetchDashboardData(apiPeriod, "active")
      }

      // 탭 전환 지연을 줄이기 위해 나머지 period는 백그라운드에서 미리 받아둡니다.
      const periodsToPrefetch = ALL_API_PERIODS.filter(
        (period) => period !== apiPeriod && !dashboardCache[period]
      )
      periodsToPrefetch.forEach((period) => {
        void fetchDashboardData(period, "background")
      })
    }

    void run()
    return () => {
      cancelled = true
      controllers.forEach((controller) => controller.abort())
    }
  }, [apiPeriod])

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
        <p className="text-muted-foreground mt-2">{loadError ?? "잠시 후 다시 시도해주세요."}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      {/* 매출 추이 + 최근 주문 한 줄 (오른쪽 허전함 해소) */}
      {/* 화면 폭이 커져도 겹치지 않도록 최근 주문을 차트 아래로 배치한다. */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>매출 추이</CardTitle>
            <div className="flex items-center gap-2 pt-1">
              <Tabs value={tabPeriod} onValueChange={(v) => setTabPeriod(v as TabPeriod)}>
                <TabsList className="h-9">
                  {/* 탭 전환 중 중복 요청을 줄이기 위해 잠깐 비활성화합니다. */}
                  <TabsTrigger value="일" disabled={isPeriodLoading}>일</TabsTrigger>
                  <TabsTrigger value="월" disabled={isPeriodLoading}>월</TabsTrigger>
                  <TabsTrigger value="년" disabled={isPeriodLoading}>년</TabsTrigger>
                </TabsList>
              </Tabs>
              {isPeriodLoading ? (
                <span className="text-xs text-muted-foreground">데이터 갱신 중...</span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <SalesChartUplot key={`sales-chart-${apiPeriod}`} data={dashboardData.salesData} height={300} period={apiPeriod} />
            </div>
          </CardContent>
        </Card>
        {/* 최근 주문 폭을 절반으로 줄이고, 우측에는 재고 부족 상품 리스트를 스크롤로 배치합니다. */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
              <div className="max-h-[340px] overflow-y-auto pr-2 space-y-4">
                {dashboardData.recentOrders.map((order) => (
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
              <div className="max-h-[340px] overflow-y-auto pr-2 space-y-3">
                {dashboardData.lowStockProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">재고 부족 상품이 없습니다.</div>
                ) : (
                  dashboardData.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.category} • {product.id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.stock <= 3 ? "destructive" : "outline"}>
                          재고: {product.stock}개
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Package className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* 재고 부족 상품 카드를 위로 이동했으므로 주문 상태 카드는 단독 배치합니다. */}
      <div className="mb-6">
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
    </div>
  )
}
