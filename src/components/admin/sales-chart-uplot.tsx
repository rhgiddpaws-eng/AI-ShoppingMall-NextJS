"use client"
/**
 * 매출 추이 막대 차트 — uPlot 사용 (경량·고성능)
 * salesData: { name: string, 매출: number }[]
 */

import { useEffect, useRef } from "react"

interface SalesDatum {
  name: string
  매출: number
}

export function SalesChartUplot({
  data,
  width,
  height = 300,
}: {
  data: SalesDatum[]
  width?: number
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<InstanceType<typeof import("uplot")> | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const xData = data.map((_, i) => i)
    const yData = data.map((d) => d.매출)
    const xLabels = data.map((d) => d.name)

    const load = async () => {
      const uPlot = (await import("uplot")).default
      const barsPath = uPlot.paths?.bars
      const opts: import("uplot").Options = {
        width: width ?? containerRef.current!.clientWidth,
        height,
        scales: {
          x: { min: 0, max: Math.max(0, data.length - 1) },
          y: {
            range: (_self, _initMin, initMax) =>
              [0, Math.max(0, (initMax ?? 0) * 1.05)] as [number | null, number | null],
          },
        },
        axes: [
          {
            values: (_, vals) => vals.map((i) => (i >= 0 && i < xLabels.length ? xLabels[Math.round(i)] : "")),
          },
          {
            values: (_, vals) => vals.map((v) => (v != null && v >= 10000 ? `${(v / 10000).toFixed(0)}만` : String(v))),
          },
        ],
        series: [
          {},
          {
            stroke: "hsl(217 91% 60%)",
            fill: "rgba(59 130 246 / 0.2)",
            paths: barsPath ? barsPath({ size: [0.6, 40] }) : undefined,
            points: { show: false },
          },
        ],
      }
      const plotData: [number[], number[]] = [xData, yData]
      const u = new uPlot(opts, plotData, containerRef.current!)
      plotRef.current = u
    }
    load()
    return () => {
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [data, height, width])

  return <div ref={containerRef} className="w-full" style={{ minHeight: height }} />
}
