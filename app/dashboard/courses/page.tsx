"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import type { Course } from "@/types"

export default function CoursesPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })

  const isLecturer = user?.role === "lecturer"

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return

      try {
        setLoading(true)

        if (isLecturer) {
          // Fetch courses created by the lecturer
          const { data } = await supabase.from("courses").select("*").eq("lecturer_id", user.id)

          if (data) {
            // Get student count for each course
            const coursesWithCount = await Promise.all(
              data.map(async (course) => {
                const { count } = await supabase
                  .from("enrollments")
                  .select("*", { count: "exact", head: true })
                  .eq("course_id", course.id)

                return {
                  ...course,
                  student_count: count || 0,
                }
              }),
            )

            setCourses(coursesWithCount as Course[])
          }
        } else {
          // Fetch courses the student is enrolled in
          const { data } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id)

          if (data && data.length > 0) {
            const courseIds = data.map((enrollment) => enrollment.course_id)

            const { data: coursesData } = await supabase
              .from("courses")
              .select(`
                *,
                users!courses_lecturer_id_fkey (
                  first_name,
                  last_name
                )
              `)
              .in("id", courseIds)

            if (coursesData) {
              setCourses(
                coursesData.map((course) => ({
                  ...course,
                  lecturer: `${course.lecturer?.first_name} ${course.lecturer?.last_name}`,
                })) as Course[],
              )
            }
          } else {
            setCourses([])
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user, supabase, isLecturer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: formData.title,
          description: formData.description,
          lecturer_id: user.id,
        })
        .select()

      if (error) throw error

      setCourses((prev) => [...prev, { ...data[0], student_count: 0 } as Course])
      setOpen(false)
      setFormData({ title: "", description: "" })
    } catch (error) {
      console.error("Error creating course:", error)
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
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            {isLecturer ? "Manage your courses and materials" : "View your enrolled courses and materials"}
          </p>
        </div>

        {isLecturer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>Add a new course to your teaching portfolio.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Course</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-2xl font-semibold">No Courses Found</h2>
          <p className="mt-2 text-muted-foreground">
            {isLecturer ? "Create your first course to get started." : "You are not enrolled in any courses yet."}
          </p>
          {isLecturer && (
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle>{course.title}</CardTitle>
                {!isLecturer && course.lecturer && (
                  <CardDescription>Lecturer: {course.lecturer.first_name} {course.lecturer.last_name}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <p className="line-clamp-3 text-muted-foreground">{course.description || "No description provided."}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between bg-muted/20 p-4">
                {isLecturer && (
                  <span className="text-sm text-muted-foreground">
                    {course.student_count} student{course.student_count === 1 ? "" : "s"}
                  </span>
                )}
                <Button variant="outline" className="ml-auto" asChild>
                  <a href={`/dashboard/courses/${course.id}`}>View Course</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

