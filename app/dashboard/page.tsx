"use client"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, Users, ClipboardCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase"
import type { DashboardStats } from "@/types"

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [stats, setStats] = useState<DashboardStats>({
    courses: 0,
    assignments: 0,
    students: 0,
    attendanceRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      try {
        setLoading(true)

        if (user.role === "lecturer") {
          // Fetch lecturer stats
          const { count: coursesCount, error: coursesError } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true })
            .eq("lecturer_id", user.id)

          if (coursesError) throw coursesError

          // Get course IDs for this lecturer
          const { data: courseData, error: courseDataError } = await supabase
            .from("courses")
            .select("id")
            .eq("lecturer_id", user.id)

          if (courseDataError) throw courseDataError

          // Handle case where lecturer has no courses
          if (!courseData || courseData.length === 0) {
            setStats({
              courses: coursesCount || 0,
              assignments: 0,
              students: 0,
              attendanceRate: 0,
            })
            setLoading(false)
            return
          }

          // Extract course IDs
          const courseIds = courseData.map((course) => course.id)

          // Get assignments count
          const { count: assignmentsCount, error: assignmentsError } = await supabase
            .from("assignments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds)

          if (assignmentsError) throw assignmentsError

          // Get students count
          const { count: studentsCount, error: studentsError } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds)

          if (studentsError) throw studentsError

          setStats({
            courses: coursesCount || 0,
            assignments: assignmentsCount || 0,
            students: studentsCount || 0,
            attendanceRate: 85, // Placeholder, would need more complex query
          })
        } else {
          // Fetch student stats
          const { count: coursesCount, error: coursesError } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("student_id", user.id)

          if (coursesError) throw coursesError

          // Get course IDs for this student
          const { data: enrollmentData, error: enrollmentDataError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", user.id)

          if (enrollmentDataError) throw enrollmentDataError

          // Handle case where student has no enrollments
          if (!enrollmentData || enrollmentData.length === 0) {
            setStats({
              courses: coursesCount || 0,
              assignments: 0,
              students: 0,
              attendanceRate: 0,
            })
            setLoading(false)
            return
          }

          // Extract course IDs
          const courseIds = enrollmentData.map((enrollment) => enrollment.course_id)

          // Get assignments count
          const { count: assignmentsCount, error: assignmentsError } = await supabase
            .from("assignments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds)

          if (assignmentsError) throw assignmentsError

          // Get submissions count
          const { count: submittedCount, error: submittedError } = await supabase
            .from("submissions")
            .select("*", { count: "exact", head: true })
            .eq("student_id", user.id)

          if (submittedError) throw submittedError

          setStats({
            courses: coursesCount || 0,
            assignments: assignmentsCount || 0,
            students: 0, // Not relevant for students
            attendanceRate: 90, // Placeholder, would need more complex query
          })
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your learning management dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === "lecturer" ? "Your Courses" : "Enrolled Courses"}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.courses}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === "lecturer" ? "Courses you are teaching" : "Courses you are enrolled in"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === "lecturer" ? "Assignments Created" : "Pending Assignments"}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignments}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === "lecturer"
                ? "Total assignments across all courses"
                : "Assignments waiting for submission"}
            </p>
          </CardContent>
        </Card>

        {user?.role === "lecturer" ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.students}</div>
              <p className="text-xs text-muted-foreground">Total students across all courses</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Assignments you have submitted</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === "lecturer" ? "Average attendance across all courses" : "Your attendance rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>Stay updated with the latest announcements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">System Maintenance</h3>
                <p className="text-sm text-muted-foreground">
                  The system will be down for maintenance on Sunday from 2-4 AM.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Posted 2 days ago</p>
              </div>
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">New Feature: Discussion Forums</h3>
                <p className="text-sm text-muted-foreground">
                  We've added discussion forums to each course. Check them out!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Posted 5 days ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Don't miss these important deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">Final Project Submission</h3>
                <p className="text-sm text-muted-foreground">Web Development - Due in 5 days</p>
              </div>
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">Mid-term Exam</h3>
                <p className="text-sm text-muted-foreground">Database Systems - Due in 10 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

