"use client"

/**
 * API 워밍 프라이머
 * - 홈 첫 진입에서 주요 API를 너무 이른 시점에 몰아 호출하지 않도록 조절합니다.
 * - 첫 화면 렌더가 안정된 뒤 idle 시점에 필요한 최소 예열만 수행합니다.
 */

import { useEffect } from "react"

import { warmCategoryApis, warmProductApis } from "@/lib/route-warmup"

const WARMUP_SESSION_KEY = "kus_api_warmup_done_v3"
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000
const INITIAL_WARMUP_DELAY_MS = 2500
const WARMUP_CATEGORIES = ["men", "new"] as const

type NavigatorConnection = {
  saveData?: boolean
  effectiveType?: string
}

function shouldSkipAggressiveWarmup() {
  if (typeof window === "undefined") return true

  // 데이터 절약 모드/저속망에서는 홈 첫 진입 체감을 우선하기 위해 강한 워밍업을 생략합니다.
  const connection = (navigator as Navigator & { connection?: NavigatorConnection })
    .connection
  if (connection?.saveData) return true

  const effectiveType = (connection?.effectiveType || "").toLowerCase()
  return (
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g"
  )
}

async function safeWarmupFetch(url: string) {
  try {
    return await fetch(url, {
      method: "GET",
      // 워밍업 응답은 캐시에 넣어 같은 세션 재요청 때 바로 재사용합니다.
      cache: "force-cache",
      keepalive: true,
    })
  } catch {
    return null
  }
}

export function ApiWarmupPrimer() {
  useEffect(() => {
    const runWarmupOnce = async () => {
      // 같은 탭에서 이미 워밍이 끝났으면 중복 실행을 생략합니다.
      if (sessionStorage.getItem(WARMUP_SESSION_KEY) === "done") return

      if (shouldSkipAggressiveWarmup()) {
        // 느린 환경에서는 워밍을 강제로 하지 않고 플래그만 기록해 반복 실행을 막습니다.
        sessionStorage.setItem(WARMUP_SESSION_KEY, "done")
        return
      }

      await Promise.all(WARMUP_CATEGORIES.map(category => warmCategoryApis(category)))

      // 대표 상품 1개만 뽑아 상세/추천 API를 최소 범위로 예열합니다.
      const listRes = await safeWarmupFetch("/api/products?limit=1")
      if (listRes?.ok) {
        const data = await listRes.json()
        const candidateIds = Array.isArray(data)
          ? data
              .map(row => row?.id)
              .filter((id): id is string | number => id != null)
              .slice(0, 1)
          : []

        await Promise.all(candidateIds.map(id => warmProductApis(id)))
      }

      sessionStorage.setItem(WARMUP_SESSION_KEY, "done")
    }

    let warmupTimerId: number | undefined
    let keepAliveId: number | undefined
    let idleId: number | undefined

    const browserGlobal = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number
      cancelIdleCallback?: (handle: number) => void
    }

    warmupTimerId = window.setTimeout(() => {
      if (typeof browserGlobal.requestIdleCallback === "function") {
        idleId = browserGlobal.requestIdleCallback(() => {
          void runWarmupOnce()
        })
        return
      }
      void runWarmupOnce()
    }, INITIAL_WARMUP_DELAY_MS)

    keepAliveId = window.setInterval(() => {
      // 탭이 보일 때만 keep-alive를 보내 과도한 트래픽을 막습니다.
      if (document.visibilityState !== "visible") return
      void safeWarmupFetch("/api/products?limit=1")
    }, KEEP_ALIVE_INTERVAL_MS)

    return () => {
      if (warmupTimerId) window.clearTimeout(warmupTimerId)
      if (keepAliveId) window.clearInterval(keepAliveId)
      if (idleId && typeof browserGlobal.cancelIdleCallback === "function") {
        browserGlobal.cancelIdleCallback(idleId)
      }
    }
  }, [])

  return null
}
