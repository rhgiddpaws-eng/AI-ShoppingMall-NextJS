"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, ShoppingBag, Package, Settings, LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  {
    title: "대시보드",
    href: "/admin",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "유저 관리",
    href: "/admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "상품 관리",
    href: "/admin/products",
    icon: <Package className="h-5 w-5" />,
  },
  {
    title: "주문 관리",
    href: "/admin/orders",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
  {
    title: "설정",
    href: "/admin/settings",
    icon: <Settings className="h-5 w-5" />,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="p-6">
        <h2 className="text-lg font-semibold">ASOS 관리자</h2>
      </div>
      <div className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.icon}
              <span className="ml-3">{item.title}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 mt-auto border-t">
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/">
            <LogOut className="h-4 w-4 mr-2" />
            사이트로 돌아가기
          </Link>
        </Button>
      </div>
    </div>
  )
}

