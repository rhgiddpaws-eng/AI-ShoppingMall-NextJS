"use client"
/** 개발용: 매출 차트만 확인 (관리자 로그인 없이) */

import { useState } from "react"
import { SalesChartUplot } from "@/components/admin/sales-chart-uplot"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const MOCK_MONTH: { name: string; sales: number }[] = [
  { name: "2025.03", sales: 7360000 },
  { name: "2025.04", sales: 8120000 },
  { name: "2025.05", sales: 5470000 },
  { name: "2025.06", sales: 7960000 },
  { name: "2025.07", sales: 7360000 },
  { name: "2025.08", sales: 7970000 },
  { name: "2025.09", sales: 7810000 },
  { name: "2025.10", sales: 11380000 },
  { name: "2025.11", sales: 8400000 },
  { name: "2025.12", sales: 8740000 },
  { name: "2026.01", sales: 9380000 },
  { name: "2026.02", sales: 50130000 },
]

export default function DevChartPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month")
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">매출 추이 (개발 확인용)</h1>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month" | "year")}>
        <TabsList className="mb-4">
          <TabsTrigger value="week">일</TabsTrigger>
          <TabsTrigger value="month">월</TabsTrigger>
          <TabsTrigger value="year">년</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="h-[300px] w-full overflow-hidden border rounded-lg p-4 bg-card">
        <SalesChartUplot data={MOCK_MONTH} height={300} period={period} />
      </div>
    </div>
  )
}
