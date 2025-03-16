"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { FileUp, Plus, Users, FileText } from "lucide-react"
import { Course, Material, Assignment, Student } from "@/types"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [course, setCourse] = useState<Course | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [materialForm, setMaterialForm] = useState({
    title: "",
    description: "",
    file_url: "https://example.com/sample.pdf", // Placeholder
  })
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    due_date: "",
    max_score: 100,
    file_url: "https://example.com/assignment.pdf", // Placeholder
  })

  const isLecturer = user?.role === "lecturer"

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !params.id) return

      try {
        setLoading(true)

        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select(`
            *,
            lecturer:users!courses_lecturer_id_fkey (
              first_name,
              last_name
            )
          `)
          .eq("id", params.id)
          .single()

        if (courseError) throw courseError

        setCourse(courseData)

        // Fetch course materials
        const { data: materialsData, error: materialsError } = await supabase
          .from("course_materials")
          .select("*")
          .eq("course_id", params.id)
          .order("created_at", { ascending: false })

        if (materialsError) throw materialsError

        setMaterials(materialsData)

        // Fetch assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignments")
          .select("*")
          .eq("course_id", params.id)
          .order("due_date", { ascending: true })

        if (assignmentsError) throw assignmentsError

        setAssignments(assignmentsData)

        // Fetch enrolled students (for lecturers only)
        if (isLecturer) {
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select(`
              student:users!enrollments_student_id_fkey (
                id,
                first_name,
                last_name,
                email
              )
            `)
            .eq("course_id", params.id)

          if (enrollmentsError) throw enrollmentsError

          setStudents(enrollmentsData.map((enrollment) => enrollment.student))
        }
      } catch (error) {
        console.error("Error fetching course data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [user, params.id, supabase, isLecturer])

  const handleMaterialChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setMaterialForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAssignmentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !course) return

    try {
      const { data, error } = await supabase
        .from("course_materials")
        .insert({
          course_id: course.id,
          title: materialForm.title,
          description: materialForm.description,
          file_url: materialForm.file_url,
          file_type: "pdf", // Placeholder
        })
        .select()

      if (error) throw error

      setMaterials((prev) => [data[0], ...prev])
      setMaterialDialogOpen(false)
      setMaterialForm({
        title: "",
        description: "",
        file_url: "https://example.com/sample.pdf",
      })
    } catch (error) {
      console.error("Error creating material:", error)
    }
  }

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !course) return

    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          course_id: course.id,
          title: assignmentForm.title,
          description: assignmentForm.description,
          due_date: assignmentForm.due_date,
          max_score: assignmentForm.max_score,
          file_url: assignmentForm.file_url,
        })
        .select()

      if (error) throw error

      setAssignments((prev) =>
        [...prev, data[0]].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
      )
      setAssignmentDialogOpen(false)
      setAssignmentForm({
        title: "",
        description: "",
        due_date: "",
        max_score: 100,
        file_url: "https://example.com/assignment.pdf",
      })
    } catch (error) {
      console.error("Error creating assignment:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <p className="text-muted-foreground">
          The course you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button className="mt-4" asChild>
          <a href="/dashboard/courses">Back to Courses</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground">
          {isLecturer
            ? "Manage your course materials, assignments, and students"
            : `Lecturer: ${course.lecturer?.first_name} ${course.lecturer?.last_name}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{course.description || "No description provided."}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          {isLecturer && <TabsTrigger value="students">Students</TabsTrigger>}
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          {isLecturer && (
            <div className="flex justify-end">
              <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleMaterialSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add Course Material</DialogTitle>
                      <DialogDescription>Upload documents, links, or resources for your students.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          name="title"
                          value={materialForm.title}
                          onChange={handleMaterialChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={materialForm.description}
                          onChange={handleMaterialChange}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="file">File Upload</Label>
                        <div className="flex items-center gap-2">
                          <Input id="file" type="file" className="hidden" />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById("file")?.click()}
                          >
                            <FileUp className="mr-2 h-4 w-4" />
                            Upload File
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          (File upload functionality would be implemented in a production environment)
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Material</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {materials.length === 0 ? (
            <div className="flex h-[30vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No Materials Yet</h2>
              <p className="mt-2 text-muted-foreground">
                {isLecturer
                  ? "Upload your first course material to get started."
                  : "The lecturer has not uploaded any materials yet."}
              </p>
              {isLecturer && (
                <Button className="mt-4" onClick={() => setMaterialDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <Card key={material.id}>
                  <CardHeader>
                    <CardTitle>{material.title}</CardTitle>
                    <CardDescription>Added on {new Date(material.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{material.description || "No description provided."}</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                        <FileUp className="mr-2 h-4 w-4" />
                        Download Material
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {isLecturer && (
            <div className="flex justify-end">
              <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAssignmentSubmit}>
                    <DialogHeader>
                      <DialogTitle>Create Assignment</DialogTitle>
                      <DialogDescription>Create a new assignment for your students.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          name="title"
                          value={assignmentForm.title}
                          onChange={handleAssignmentChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={assignmentForm.description}
                          onChange={handleAssignmentChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="due_date">Due Date</Label>
                        <Input
                          id="due_date"
                          name="due_date"
                          type="datetime-local"
                          value={assignmentForm.due_date}
                          onChange={handleAssignmentChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="max_score">Maximum Score</Label>
                        <Input
                          id="max_score"
                          name="max_score"
                          type="number"
                          value={assignmentForm.max_score}
                          onChange={handleAssignmentChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="assignment_file">File Upload</Label>
                        <div className="flex items-center gap-2">
                          <Input id="assignment_file" type="file" className="hidden" />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById("assignment_file")?.click()}
                          >
                            <FileUp className="mr-2 h-4 w-4" />
                            Upload File
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          (File upload functionality would be implemented in a production environment)
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Assignment</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="flex h-[30vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No Assignments Yet</h2>
              <p className="mt-2 text-muted-foreground">
                {isLecturer
                  ? "Create your first assignment to get started."
                  : "The lecturer has not created any assignments yet."}
              </p>
              {isLecturer && (
                <Button className="mt-4" onClick={() => setAssignmentDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>Due: {new Date(assignment.due_date).toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{assignment.description || "No description provided."}</p>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Maximum Score:</span> {assignment.max_score}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" asChild>
                        <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                          <FileUp className="mr-2 h-4 w-4" />
                          Download Assignment
                        </a>
                      </Button>
                      {!isLecturer && <Button>Submit Assignment</Button>}
                      {isLecturer && <Button variant="outline">View Submissions</Button>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isLecturer && (
          <TabsContent value="students" className="space-y-4">
            <div className="flex justify-end">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Students
              </Button>
            </div>

            {students.length === 0 ? (
              <div className="flex h-[30vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">No Students Enrolled</h2>
                <p className="mt-2 text-muted-foreground">Add students to your course to get started.</p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Students
                </Button>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>
                    {students.length} student{students.length === 1 ? "" : "s"} enrolled in this course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Progress
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

