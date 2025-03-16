"use client"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react"
import type { Assignment } from "@/types"

export default function AssignmentsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const isLecturer = user?.role === "lecturer"

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return

      try {
        setLoading(true)

        if (isLecturer) {
          // Get course IDs for this lecturer
          const { data: courseData } = await supabase.from("courses").select("id").eq("lecturer_id", user.id)

          // Handle case where lecturer has no courses
          if (!courseData || courseData.length === 0) {
            setAssignments([])
            setLoading(false)
            return
          }

          // Extract course IDs
          const courseIds = courseData.map((course) => course.id)

          // Fetch assignments for these courses
          const { data } = await supabase
            .from("assignments")
            .select(`
              *,
              course:courses (
                id,
                title
              )
            `)
            .in("course_id", courseIds)
            .order("due_date", { ascending: true })

          if (data) {
            setAssignments(data as unknown as Assignment[])
          }
        } else {
          // Get course IDs for this student
          const { data: enrollmentData } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", user.id)

          // Handle case where student has no enrollments
          if (!enrollmentData || enrollmentData.length === 0) {
            setAssignments([])
            setLoading(false)
            return
          }

          // Extract course IDs
          const courseIds = enrollmentData.map((enrollment) => enrollment.course_id)

          // Fetch assignments for these courses
          const { data } = await supabase
            .from("assignments")
            .select(`
              *,
              course:courses (
                id,
                title
              ),
              submission:submissions (
                id,
                submitted_at,
                score
              )
            `)
            .in("course_id", courseIds)
            .order("due_date", { ascending: true })

          if (data) {
            // Process submissions to get the latest one for each assignment
            const processedAssignments = data.map((assignment: any) => ({
              ...assignment,
              submission:
                assignment.submission && assignment.submission.length > 0 ? assignment.submission[0] : undefined,
            }))

            setAssignments(processedAssignments as Assignment[])
          }
        }
      } catch (error) {
        console.error("Error fetching assignments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [user, supabase, isLecturer])

  const getAssignmentStatus = (assignment: Assignment) => {
    const now = new Date()
    const dueDate = new Date(assignment.due_date)

    if (!isLecturer && assignment.submission) {
      return {
        label: "Submitted",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      }
    }

    if (dueDate < now) {
      return {
        label: "Overdue",
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
      }
    }

    // Due within the next 48 hours
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilDue <= 48) {
      return {
        label: "Due Soon",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      }
    }

    return {
      label: "Upcoming",
      color: "bg-blue-100 text-blue-800",
      icon: FileText,
    }
  }

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
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          {isLecturer ? "Manage assignments for your courses" : "View and submit your assignments"}
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Assignments Found</h2>
          <p className="mt-2 text-muted-foreground">
            {isLecturer ? "Create assignments in your courses to get started." : "You don't have any assignments yet."}
          </p>
          {isLecturer && (
            <Button className="mt-4" asChild>
              <a href="/dashboard/courses">Go to Courses</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const status = getAssignmentStatus(assignment)
            const StatusIcon = status.icon

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{assignment.title}</CardTitle>
                      <CardDescription>Course: {assignment.course?.title}</CardDescription>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{assignment.description || "No description provided."}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Due Date</p>
                      <p className="text-muted-foreground">{new Date(assignment.due_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Maximum Score</p>
                      <p className="text-muted-foreground">{assignment.max_score}</p>
                    </div>
                    {!isLecturer && assignment.submission && !Array.isArray(assignment.submission) && (
                      <>
                        <div>
                          <p className="font-medium">Submitted On</p>
                          <p className="text-muted-foreground">
                            {new Date(assignment.submission.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Score</p>
                          <p className="text-muted-foreground">
                            {assignment.submission.score !== null
                              ? `${assignment.submission.score}/${assignment.max_score}`
                              : "Not graded yet"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="ml-auto" asChild>
                    <a href={`/dashboard/assignments/${assignment.id}`}>
                      {isLecturer
                        ? "View Submissions"
                        : assignment.submission
                          ? "View Submission"
                          : "Submit Assignment"}
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

