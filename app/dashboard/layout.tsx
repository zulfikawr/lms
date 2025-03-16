"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // This ensures we only run the redirect on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router, isClient])

  // Show loading state only for a reasonable time
  const [showLoading, setShowLoading] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false)
    }, 3000) // Show loading for max 3 seconds

    return () => clearTimeout(timer)
  }, [])

  if (!isClient) {
    return null // Don't render anything during SSR
  }

  if (loading && showLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // If we're still loading but past the timeout, or if there's no user, render the layout anyway
  // The useEffect above will handle the redirect if needed
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex w-full flex-1 flex-col overflow-hidden pt-16 md:pt-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

