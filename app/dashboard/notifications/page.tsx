"use client"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BookOpen, Calendar, FileText, MessageSquare, CheckCircle } from "lucide-react"

type Notification = {
  id: string
  title: string
  content: string
  is_read: boolean
  related_entity_type: string
  related_entity_id: string
  created_at: string
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return

      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        setNotifications(data)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user, supabase])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user?.id)
        .eq("is_read", false)

      if (error) throw error

      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "course":
        return <BookOpen className="h-5 w-5 text-blue-500" />
      case "assignment":
        return <FileText className="h-5 w-5 text-amber-500" />
      case "discussion":
        return <MessageSquare className="h-5 w-5 text-green-500" />
      case "calendar":
        return <Calendar className="h-5 w-5 text-purple-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with important announcements and activities</p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Notifications</h2>
          <p className="mt-2 text-muted-foreground">You don't have any notifications at the moment.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  notification.is_read ? "bg-background" : "bg-blue-50"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {getNotificationIcon(notification.related_entity_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${!notification.is_read ? "text-blue-600" : ""}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.content}</p>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-xs"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

