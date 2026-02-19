"use client"

/**
 * API 워밍 프라이머
 * - 홈 첫 진입에서 주요 카테고리/상세 API를 미리 깨워 첫 클릭 지연을 줄입니다.
 * - 같은 세션에서는 한 번만 강한 워밍을 수행하고, 이후에는 가벼운 keep-alive만 유지합니다.
 */

import { useEffect } from "react"
import { warmCategoryApis, warmProductApis } from "@/lib/route-warmup"

const WARMUP_SESSION_KEY = "kus_api_warmup_done_v2"
const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000

async function safeWarmupFetch(url: string) {
  try {
    return await fetch(url, {
      method: "GET",
      // 워밍업 응답도 브라우저 캐시에 적재해 실제 재진입에서 바로 재사용합니다.
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

      // 첫 클릭 빈도가 높은 카테고리를 우선 예열합니다.
      const categories = ["men", "women", "accessories", "shoes", "new"]
      for (const category of categories) {
        await warmCategoryApis(category)
      }

      // 대표 상품 2개를 뽑아 상세/추천 API까지 같이 예열합니다.
      const listRes = await safeWarmupFetch("/api/products?limit=2")
      if (listRes?.ok) {
        const data = await listRes.json()
        const candidateIds = Array.isArray(data)
          ? data
              .map(row => row?.id)
              .filter((id): id is string | number => id != null)
              .slice(0, 2)
          : []

        await Promise.all(candidateIds.map(id => warmProductApis(id)))
      }

      sessionStorage.setItem(WARMUP_SESSION_KEY, "done")
    }

    // 사용자가 빠르게 이동하더라도 워밍이 먼저 시작되도록 짧은 지연만 둡니다.
    const timerId = window.setTimeout(() => {
      void runWarmupOnce()
    }, 80)

    const keepAliveId = window.setInterval(() => {
      // 탭이 보일 때만 keep-alive를 보내 과도한 트래픽을 막습니다.
      if (document.visibilityState !== "visible") return
      void safeWarmupFetch("/api/products?limit=1")
    }, KEEP_ALIVE_INTERVAL_MS)

    return () => {
      window.clearTimeout(timerId)
      window.clearInterval(keepAliveId)
    }
  }, [])

  return null
}
