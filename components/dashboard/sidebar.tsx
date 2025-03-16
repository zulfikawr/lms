"use client"

import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { BookOpen, Calendar, FileText, Home, MessageSquare, Users, Bell, ClipboardCheck, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isLecturer = user?.role === "lecturer"

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Courses",
      href: "/dashboard/courses",
      icon: BookOpen,
    },
    {
      title: "Assignments",
      href: "/dashboard/assignments",
      icon: FileText,
    },
    {
      title: "Calendar",
      href: "/dashboard/calendar",
      icon: Calendar,
    },
    {
      title: "Discussion",
      href: "/dashboard/discussion",
      icon: MessageSquare,
    },
    {
      title: "Attendance",
      href: "/dashboard/attendance",
      icon: ClipboardCheck,
    },
    ...(isLecturer
      ? [
          {
            title: "Students",
            href: "/dashboard/students",
            icon: Users,
          },
        ]
      : []),
    {
      title: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
    },
  ]

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Mobile menu button - visible only on small screens */}
      <div className="fixed left-4 top-4 z-50 block md:hidden">
        <Button variant="outline" size="icon" onClick={toggleSidebar} className="h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Overlay for mobile - only visible when sidebar is open */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            <span>LMS</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="py-4">
          <div className="px-4 py-2">
            <p className="text-sm text-muted-foreground">
              Logged in as{" "}
              <span className="font-medium text-foreground">
                {user?.first_name} {user?.last_name}
              </span>
            </p>
            <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
          </div>
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setIsOpen(false)} // Close sidebar on mobile when a link is clicked
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}

