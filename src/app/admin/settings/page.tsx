"use client"
// =============================================================================
// 관리자 설정 - /admin/settings
// 사이트·관리자 관련 설정 UI (추후 알림·권한·시스템 설정 확장 예정)
// =============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

/** 관리자 설정: 현재 안내 문구만 표시, 추후 설정 옵션 추가 예정 */
export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>관리자 설정</CardTitle>
            </div>
            <CardDescription>사이트 및 관리자 관련 설정을 변경할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              추후 알림, 권한, 시스템 설정 등의 옵션이 추가될 예정입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
