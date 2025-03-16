"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Users, Mail, BookOpen } from "lucide-react"

type Course = {
  id: string
  title: string
}

type Student = {
  id: string
  first_name: string
  last_name: string
  email: string
  courses: string[]
}

export default function StudentsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState({
    student_email: "",
    course_id: "",
  })

  // Check if user is lecturer
  const isLecturer = user?.role === "lecturer"

  useEffect(() => {
    // Redirect if not a lecturer
    if (user && !isLecturer) {
      window.location.href = "/dashboard"
    }
  }, [user, isLecturer])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !isLecturer) return

      try {
        setLoading(true)

        // Fetch lecturer's courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, title")
          .eq("lecturer_id", user.id)

        if (coursesError) throw coursesError

        setCourses(coursesData)

        if (coursesData.length === 0) {
          setLoading(false)
          return
        }

        // Get all students enrolled in lecturer's courses
        const courseIds = coursesData.map((course) => course.id)

        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select(`
            student_id,
            course_id,
            course:courses (
              title
            )
          `)
          .in("course_id", courseIds)

        if (enrollmentsError) throw enrollmentsError

        // Group enrollments by student
        const studentEnrollments: Record<string, { courseIds: string[]; courseTitles: string[] }> = {}

        enrollmentsData.forEach((enrollment) => {
          if (!studentEnrollments[enrollment.student_id]) {
            studentEnrollments[enrollment.student_id] = {
              courseIds: [],
              courseTitles: [],
            }
          }

          studentEnrollments[enrollment.student_id].courseIds.push(enrollment.course_id)
          studentEnrollments[enrollment.student_id].courseTitles.push(enrollment.course.title)
        })

        // Get student details
        const studentIds = Object.keys(studentEnrollments)

        if (studentIds.length === 0) {
          setStudents([])
          setFilteredStudents([])
          setLoading(false)
          return
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("id, first_name, last_name, email")
          .in("id", studentIds)
          .eq("role", "student")

        if (studentsError) throw studentsError

        // Combine student data with enrollments
        const studentsWithCourses = studentsData.map((student) => ({
          ...student,
          courses: studentEnrollments[student.id]?.courseTitles || [],
          courseIds: studentEnrollments[student.id]?.courseIds || [],
        }))

        setStudents(studentsWithCourses)
        setFilteredStudents(studentsWithCourses)
      } catch (error) {
        console.error("Error fetching students data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, isLecturer])

  // Filter students based on search query and selected course
  useEffect(() => {
    let filtered = [...students]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query),
      )
    }

    // Filter by course
    if (selectedCourse !== "all") {
      filtered = filtered.filter((student) => student.courseIds && student.courseIds.includes(selectedCourse))
    }

    setFilteredStudents(filtered)
  }, [searchQuery, selectedCourse, students])

  const handleFormChange = (name: string, value: string) => {
    setEnrollForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      // Check if student exists
      const { data: studentData, error: studentError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("email", enrollForm.student_email)
        .eq("role", "student")
        .single()

      if (studentError) {
        alert("Student not found. Please check the email address.")
        return
      }

      // Check if student is already enrolled in the course
      const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", studentData.id)
        .eq("course_id", enrollForm.course_id)
        .single()

      if (existingEnrollment) {
        alert("Student is already enrolled in this course.")
        return
      }

      // Enroll student in the course
      const { error: enrollError } = await supabase.from("enrollments").insert({
        student_id: studentData.id,
        course_id: enrollForm.course_id,
      })

      if (enrollError) throw enrollError

      // Get course title
      const course = courses.find((c) => c.id === enrollForm.course_id)

      // Update students list
      const existingStudent = students.find((s) => s.id === studentData.id)

      if (existingStudent) {
        // Update existing student
        setStudents((prev) =>
          prev.map((student) =>
            student.id === studentData.id
              ? {
                  ...student,
                  courses: [...student.courses, course?.title || ""],
                  courseIds: [...student.courseIds, enrollForm.course_id],
                }
              : student,
          ),
        )
      } else {
        // Add new student
        setStudents((prev) => [
          ...prev,
          {
            ...studentData,
            courses: [course?.title || ""],
            courseIds: [enrollForm.course_id],
          },
        ])
      }

      setDialogOpen(false)
      setEnrollForm({
        student_email: "",
        course_id: "",
      })

      alert("Student enrolled successfully!")
    } catch (error) {
      console.error("Error enrolling student:", error)
      alert("An error occurred while enrolling the student.")
    }
  }

  if (!isLecturer) {
    return null
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
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage students enrolled in your courses</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Enroll Student</DialogTitle>
                <DialogDescription>Add a student to one of your courses.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="student_email">Student Email</Label>
                  <Input
                    id="student_email"
                    type="email"
                    value={enrollForm.student_email}
                    onChange={(e) => handleFormChange("student_email", e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="course">Course</Label>
                  <Select
                    value={enrollForm.course_id}
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
              </div>
              <DialogFooter>
                <Button type="submit">Enroll Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {courses.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Courses Created</h2>
          <p className="mt-2 text-muted-foreground">You need to create courses before you can manage students.</p>
          <Button className="mt-4" asChild>
            <a href="/dashboard/courses">Create Course</a>
          </Button>
        </div>
      ) : students.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Students Enrolled</h2>
          <p className="mt-2 text-muted-foreground">You don't have any students enrolled in your courses yet.</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enroll Student
          </Button>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filter Students</CardTitle>
              <CardDescription>Search and filter students by name, email, or course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Students ({filteredStudents.length})</CardTitle>
              <CardDescription>Students enrolled in your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled Courses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.courses.join(", ")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`mailto:${student.email}`}>
                            <Mail className="mr-2 h-4 w-4" />
                            Contact
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

