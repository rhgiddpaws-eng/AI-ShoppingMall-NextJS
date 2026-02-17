"use client"
/**
 * 매출 추이 막대 차트 — uPlot 사용 (경량·고성능)
 * salesData: { name: string, sales: number }[]
 * period: "week" | "month" | "year" - 기간별로 다른 렌더링
 */

import { useEffect, useRef } from "react"
import "uplot/dist/uPlot.min.css"

interface SalesDatum {
  name: string
  // 서버 인코딩 이슈/과거 데이터와 호환되도록 매출 키를 여러 형태로 읽습니다.
  sales?: number
  매출?: number
  "留ㅼ텧"?: number
}

// sales(신규) → 매출(구버전) → 깨진 키(레거시) 순서로 읽어 배포 전후 데이터를 모두 지원합니다.
const getSalesAmount = (datum: SalesDatum): number => {
  if (typeof datum.sales === "number" && Number.isFinite(datum.sales)) return datum.sales
  if (typeof datum.매출 === "number" && Number.isFinite(datum.매출)) return datum.매출
  if (typeof datum["留ㅼ텧"] === "number" && Number.isFinite(datum["留ㅼ텧"])) return datum["留ㅼ텧"]
  return 0
}

export function SalesChartUplot({
  data,
  width,
  height = 300,
  period = "month",
}: {
  data: SalesDatum[]
  width?: number
  height?: number
  period?: "week" | "month" | "year"
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<InstanceType<typeof import("uplot")> | null>(null)
  const hoverInfoRef = useRef<HTMLDivElement | null>(null)
  const hoveredIdxRef = useRef<number | null>(null)
  const isRenderingRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    let isCancelled = false

    // 이미 렌더링 중이면 건너뛰기 (중복 방지)
    if (isRenderingRef.current) return
    isRenderingRef.current = true

    // 기존 인스턴스 완전 정리
    if (plotRef.current) {
      if ((plotRef.current as any)._cleanupListeners) {
        ; (plotRef.current as any)._cleanupListeners()
      }
      plotRef.current.destroy()
      plotRef.current = null
    }
    if (hoverInfoRef.current) {
      hoverInfoRef.current.remove()
      hoverInfoRef.current = null
    }

    // 컨테이너 비우기 (중복 렌더링 방지)
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }

    const xData = data.map((_, i) => i)
    const yData = data.map((d) => getSalesAmount(d))

    const load = async () => {
      if (!containerRef.current) return // 컴포넌트가 언마운트되었을 수 있음

      const uPlot = (await import("uplot")).default
      if (isCancelled) return

      // 금액 포맷 통일: 띄어쓰기 없이 "만원", "억원"
      const formatAmount = (v: number) => {
        if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`
        if (v >= 10000) return `${(v / 10000).toFixed(0)}만원`
        return `${Math.round(v).toLocaleString()}원`
      }
      // 기간별 막대 너비 (비율 올려서 간격 줄임)
      const barWidthRatio = period === "week" ? 0.88 : period === "month" ? 0.82 : 0.7

      // 기간별 라벨 설정
      const getPeriodLabel = () => {
        switch (period) {
          case "week":
            return "일"
          case "month":
            return "월"
          case "year":
            return "년"
          default:
            return ""
        }
      }

      const opts: import("uplot").Options = {
        width: width ?? containerRef.current!.clientWidth,
        height,
        scales: {
          x: {
            time: false, // 카테고리형 X축 (타임스탬프 아님)
            min: -0.5,
            max: data.length - 0.5
          },
          y: {
            range: (_self, _initMin, initMax) =>
              [0, Math.max(0, (initMax ?? 0) * 1.1)] as [number | null, number | null],
          },
        },
        axes: [
          {
            // 막대 아래: 일 1~30, 월 1~12, 년 1~5 숫자로 표시
            values: (_, vals) =>
              vals.map((i) => {
                const idx = Math.round(i)
                if (idx < 0 || idx >= data.length) return ""
                return String(idx + 1) // 1-based index
              }),
            gap: 4,
            size: 60,
            space: 40, // 최소 간격 (라벨 겹침 방지)
            font: "16px Pretendard, sans-serif",
            stroke: "#a1a1aa", // 명시적인 색상 (light gray)
            grid: { show: false },
            // 소수점 틱 장비: 정수 단위로만 틱이 찍히도록 설정 (중복 라벨 방지)
            incrs: [1, 2, 3, 4, 5, 10],
          },
          {
            size: 50,
            values: (_, vals) =>
              vals.map((v) => {
                if (v == null) return ""
                if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`
                if (v >= 10000) return `${(v / 10000).toFixed(0)}만`
                return String(Math.round(v))
              }),
            font: "12px Pretendard, sans-serif",
            stroke: "#a1a1aa",
          },
        ],
        series: [
          {},
          {
            label: "매출",
            stroke: "transparent",
            fill: "transparent",
            points: { show: false },
          },
        ],
        // 기본 범례/툴팁 비활성화
        legend: { show: false },
        cursor: {
          show: false,
          drag: { x: false, y: false },
        },
        hooks: {
          draw: [
            (u) => {
              const ctx = u.ctx
              if (!ctx) return

              ctx.save()

              // 1. 막대 그리기
              const hoveredIdx = hoveredIdxRef.current
              for (let i = 0; i < data.length; i++) {
                const xVal = u.valToPos(i, "x", true)
                const yVal = u.valToPos(getSalesAmount(data[i]), "y", true)
                const yZero = u.valToPos(0, "y", true)

                if (xVal != null && yVal != null && yZero != null) {
                  const barWidth = (u.bbox.width / data.length) * barWidthRatio
                  const x = xVal - barWidth / 2
                  const y = yVal
                  const h = yZero - yVal
                  const isHovered = hoveredIdx === i

                  ctx.shadowBlur = 0
                  ctx.fillStyle = isHovered ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.4)"
                  ctx.fillRect(x, y, barWidth, h)

                  // 막대 테두리
                  ctx.strokeStyle = "rgba(34, 197, 94, 1)"
                  ctx.lineWidth = 1
                  ctx.strokeRect(x, y, barWidth, h)
                }
              }

              // 2. 증감 선(Trend Line) 그리기 (막대 중앙 연결)
              ctx.beginPath()
              ctx.strokeStyle = "#f97316" // Orange-500
              ctx.lineWidth = 2
              ctx.lineJoin = "round"

              let firstPoint = true

              data.forEach((d, i) => {
                const xVal = u.valToPos(i, "x", true)
                const yVal = u.valToPos(getSalesAmount(d), "y", true)

                if (xVal != null && yVal != null) {
                  if (firstPoint) {
                    ctx.moveTo(xVal, yVal)
                    firstPoint = false
                  } else {
                    ctx.lineTo(xVal, yVal)
                  }
                }
              })
              ctx.stroke()

              // 3. 선 위의 포인트 점(Circle)
              ctx.fillStyle = "#fff"
              ctx.strokeStyle = "#f97316"
              ctx.lineWidth = 2

              data.forEach((d, i) => {
                const xVal = u.valToPos(i, "x", true)
                const yVal = u.valToPos(getSalesAmount(d), "y", true)
                if (xVal != null && yVal != null) {
                  ctx.beginPath()
                  ctx.arc(xVal, yVal, 3, 0, 2 * Math.PI)
                  ctx.fill()
                  ctx.stroke()
                }
              })

              ctx.restore()

              // 4. 호버된 막대 위에 금액 표시
              if (hoveredIdx != null && hoveredIdx >= 0 && hoveredIdx < data.length) {
                const i = hoveredIdx
                const xVal = u.valToPos(i, "x", true)
                const yVal = u.valToPos(getSalesAmount(data[i]), "y", true)
                const v = getSalesAmount(data[i])

                if (xVal != null && yVal != null) {
                  ctx.save()
                  const label = formatAmount(v)
                  const y = yVal - 10
                  const fontSize = 16
                  ctx.font = `bold ${fontSize}px sans-serif`
                  ctx.textAlign = "center"
                  ctx.textBaseline = "bottom"
                  ctx.strokeStyle = "rgba(255,255,255,0.9)"
                  ctx.lineWidth = 3
                  ctx.strokeText(label, xVal, y)
                  ctx.fillStyle = "#1e293b" // Dark text
                  ctx.fillText(label, xVal, y)
                  ctx.restore()
                }
              }
            },
          ],
        },
      }

      const plotData: [number[], number[]] = [xData, yData]
      const u = new uPlot(opts, plotData, containerRef.current!)

      // 차트 밑 고정 툴팁 영역 — 호버 시 "일/월/년: 이름 / 금액 원" 표시
      const hoverInfo = document.createElement("div")
      hoverInfo.className = "uplot-hover-info"
      hoverInfo.setAttribute("aria-live", "polite")
      hoverInfo.style.cssText = `
        margin-top: 12px;
        min-height: 50px;
        padding: 12px 16px;
        border-radius: 8px;
        background: hsl(var(--muted));
        font-size: 18px;
        font-weight: 600;
        color: hsl(var(--foreground));
      `
      hoverInfo.textContent = "차트에 마우스를 올려보세요"
      containerRef.current!.appendChild(hoverInfo)
      hoverInfoRef.current = hoverInfo

      const containerEl = containerRef.current!
      const firstCanvas = containerEl.querySelector("canvas")
      const rectEl = firstCanvas ?? containerEl

      const handleMouseMove = (e: MouseEvent) => {
        if (e.target === hoverInfo || hoverInfo.contains(e.target as Node)) return
        const rect = rectEl.getBoundingClientRect()
        const xInCanvas = e.clientX - rect.left
        const xInPlot = xInCanvas - u.bbox.left
        const xVal = u.posToVal(xInPlot, "x")
        const idx = Math.round(xVal)

        const prevIdx = hoveredIdxRef.current
        hoveredIdxRef.current = idx >= 0 && idx < data.length ? idx : null
        if (prevIdx !== hoveredIdxRef.current) u.redraw()

        if (idx >= 0 && idx < data.length) {
          const datum = data[idx]
          const salesVal = datum ? getSalesAmount(datum) : 0
          const periodLabel = getPeriodLabel()
          // 형식: "년/월/일 매출 : 금액 원"
          hoverInfo.textContent = `${datum.name} ${periodLabel} 매출 : ${formatAmount(salesVal)}`
        } else {
          hoverInfo.textContent = "차트에 마우스를 올려보세요"
        }
      }

      const handleMouseLeave = () => {
        hoveredIdxRef.current = null
        u.redraw()
        hoverInfo.textContent = "차트에 마우스를 올려보세요"
      }

      containerEl.addEventListener("mousemove", handleMouseMove)
      containerEl.addEventListener("mouseleave", handleMouseLeave)

      plotRef.current = u
        ; (plotRef.current as any)._cleanupListeners = () => {
          containerEl.removeEventListener("mousemove", handleMouseMove)
          containerEl.removeEventListener("mouseleave", handleMouseLeave)
        }
    }

    load()

    return () => {
      isCancelled = true
      if (plotRef.current && (plotRef.current as any)._cleanupListeners) {
        ; (plotRef.current as any)._cleanupListeners()
      }
      if (hoverInfoRef.current) {
        hoverInfoRef.current.remove()
        hoverInfoRef.current = null
      }
      plotRef.current?.destroy()
      plotRef.current = null
      isRenderingRef.current = false
    }
  }, [data, height, width, period])

  return <div ref={containerRef} className="w-full" style={{ minHeight: height, position: "relative" }} />
}
