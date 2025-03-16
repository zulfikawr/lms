"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Calendar, CheckCircle, XCircle, Clock } from "lucide-react"
import type { Course, AttendanceSession } from "@/types"

export default function AttendancePage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    course_id: "",
    session_date: "",
  })

  const isLecturer = user?.role === "lecturer"

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch courses
        if (isLecturer) {
          const { data: coursesData } = await supabase.from("courses").select("id, title").eq("lecturer_id", user.id)

          if (coursesData) {
            setCourses(coursesData as Course[])
          }
        } else {
          const { data: enrollmentsData } = await supabase
            .from("enrollments")
            .select("course:courses(id, title)")
            .eq("student_id", user.id)

          if (enrollmentsData) {
            const extractedCourses = enrollmentsData.map((enrollment) => enrollment.course) as Course[]
            setCourses(extractedCourses)
          }
        }

        // Fetch attendance sessions
        if (isLecturer) {
          // Get course IDs for this lecturer
          const { data: courseData } = await supabase.from("courses").select("id").eq("lecturer_id", user.id)

          // Handle case where lecturer has no courses
          if (!courseData || courseData.length === 0) {
            setSessions([])
            setLoading(false)
            return
          }

          // Extract course IDs
          const courseIds = courseData.map((course) => course.id)

          const { data: sessionsData } = await supabase
            .from("attendance_sessions")
            .select(`
              *,
              course:courses (
                title
              )
            `)
            .in("course_id", courseIds)
            .order("session_date", { ascending: false })

          if (sessionsData) {
            // Get attendance stats for each session
            const sessionsWithStats = await Promise.all(
              sessionsData.map(async (session: any) => {
                const { count: presentCount } = await supabase
                  .from("attendance_records")
                  .select("*", { count: "exact", head: true })
                  .eq("session_id", session.id)
                  .eq("status", "present")

                const { count: totalStudents } = await supabase
                  .from("enrollments")
                  .select("*", { count: "exact", head: true })
                  .eq("course_id", session.course_id)

                return {
                  ...session,
                  attendance_count: presentCount || 0,
                  total_students: totalStudents || 0,
                }
              }),
            )

            setSessions(sessionsWithStats as AttendanceSession[])
          }
        } else {
          // Get course IDs for this student
          const { data: enrollmentData } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", user.id)

          // Handle case where student has no enrollments
          if (!enrollmentData || enrollmentData.length === 0) {
            setSessions([])
            setLoading(false)
            return
          }

          // Extract course IDs
          const courseIds = enrollmentData.map((enrollment) => enrollment.course_id)

          const { data: sessionsData } = await supabase
            .from("attendance_sessions")
            .select(`
              *,
              course:courses (
                title
              )
            `)
            .in("course_id", courseIds)
            .order("session_date", { ascending: false })

          if (sessionsData) {
            // Get student's attendance status for each session
            const sessionsWithStatus = await Promise.all(
              sessionsData.map(async (session: any) => {
                const { data: recordData } = await supabase
                  .from("attendance_records")
                  .select("status")
                  .eq("session_id", session.id)
                  .eq("student_id", user.id)
                  .single()

                return {
                  ...session,
                  student_status: recordData?.status as "present" | "absent" | "late" | undefined,
                }
              }),
            )

            setSessions(sessionsWithStatus as AttendanceSession[])
          }
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, isLecturer])

  const handleFormChange = (name: string, value: string) => {
    setSessionForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      // Create new attendance session
      const { data: sessionData, error: sessionError } = await supabase
        .from("attendance_sessions")
        .insert({
          course_id: sessionForm.course_id,
          session_date: sessionForm.session_date,
        })
        .select()

      if (sessionError) throw sessionError

      // Get enrolled students for the course
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", sessionForm.course_id)

      if (enrollmentsError) throw enrollmentsError

      // Create attendance records for all enrolled students (default to absent)
      if (enrollmentsData.length > 0) {
        const attendanceRecords = enrollmentsData.map((enrollment) => ({
          session_id: sessionData[0].id,
          student_id: enrollment.student_id,
          status: "absent",
        }))

        const { error: recordsError } = await supabase.from("attendance_records").insert(attendanceRecords)

        if (recordsError) throw recordsError
      }

      // Add the new session to the list
      const { data: courseData } = await supabase
        .from("courses")
        .select("title")
        .eq("id", sessionForm.course_id)
        .single()

      setSessions((prev) => [
        {
          ...sessionData[0],
          course: { title: courseData?.title || "" },
          attendance_count: 0,
          total_students: enrollmentsData.length,
        } as AttendanceSession,
        ...prev,
      ])

      setDialogOpen(false)
      setSessionForm({
        course_id: "",
        session_date: "",
      })
    } catch (error) {
      console.error("Error creating attendance session:", error)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {isLecturer ? "Manage attendance for your courses" : "View your attendance records"}
          </p>
        </div>

        {isLecturer && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Attendance Session</DialogTitle>
                  <DialogDescription>Create a new attendance session for your course.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="course">Course</Label>
                    <Select
                      value={sessionForm.course_id}
                      onValueChange={(value) => handleFormChange("course_id", value)}
                      required
                    >
                      <SelectTrigger id="course">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="session_date">Session Date</Label>
                    <Input
                      id="session_date"
                      type="datetime-local"
                      value={sessionForm.session_date}
                      onChange={(e) => handleFormChange("session_date", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Session</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Attendance Sessions</h2>
          <p className="mt-2 text-muted-foreground">
            {isLecturer
              ? "Create your first attendance session to get started."
              : "No attendance sessions have been created for your courses yet."}
          </p>
          {isLecturer && (
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Sessions</CardTitle>
            <CardDescription>
              {isLecturer ? "Manage attendance for your course sessions" : "View your attendance for course sessions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  {isLecturer ? (
                    <>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Rate</TableHead>
                    </>
                  ) : (
                    <TableHead>Status</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.course.title}</TableCell>
                    <TableCell>{new Date(session.session_date).toLocaleString()}</TableCell>
                    {isLecturer ? (
                      <>
                        <TableCell>
                          {session.attendance_count} / {session.total_students}
                        </TableCell>
                        <TableCell>
                          {session.total_students && session.total_students > 0
                            ? `${Math.round((session.attendance_count! / session.total_students!) * 100)}%`
                            : "N/A"}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell>
                        {session.student_status === "present" && (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Present
                          </span>
                        )}
                        {session.student_status === "absent" && (
                          <span className="flex items-center text-red-600">
                            <XCircle className="mr-1 h-4 w-4" />
                            Absent
                          </span>
                        )}
                        {session.student_status === "late" && (
                          <span className="flex items-center text-yellow-600">
                            <Clock className="mr-1 h-4 w-4" />
                            Late
                          </span>
                        )}
                        {!session.student_status && <span className="text-muted-foreground">Not recorded</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/dashboard/attendance/${session.id}`}>{isLecturer ? "Manage" : "View"}</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

