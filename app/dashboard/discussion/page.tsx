"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { MessageSquare, Plus, User } from "lucide-react"

type Course = {
  id: string
  title: string
}

type DiscussionTopic = {
  id: string
  title: string
  content: string
  created_at: string
  course: {
    id: string
    title: string
  }
  creator: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
  reply_count: number
}

export default function DiscussionPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [topics, setTopics] = useState<DiscussionTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [topicForm, setTopicForm] = useState({
    course_id: "",
    title: "",
    content: "",
  })

  const isLecturer = user?.role === "lecturer"

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch courses
        if (isLecturer) {
          const { data: coursesData, error: coursesError } = await supabase
            .from("courses")
            .select("id, title")
            .eq("lecturer_id", user.id)

          if (coursesError) throw coursesError

          setCourses(coursesData)
        } else {
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course:courses(id, title)")
            .eq("student_id", user.id)

          if (enrollmentsError) throw enrollmentsError

          setCourses(enrollmentsData.map((enrollment) => enrollment.course))
        }

        // Fetch discussion topics
        let query = supabase
          .from("discussion_topics")
          .select(`
            *,
            course:courses (
              id,
              title
            ),
            creator:users!discussion_topics_created_by_fkey (
              id,
              first_name,
              last_name,
              role
            )
          `)
          .order("created_at", { ascending: false })

        if (isLecturer) {
          query = query.in("course_id", supabase.from("courses").select("id").eq("lecturer_id", user.id))
        } else {
          query = query.in("course_id", supabase.from("enrollments").select("course_id").eq("student_id", user.id))
        }

        const { data: topicsData, error: topicsError } = await query

        if (topicsError) throw topicsError

        // Get reply count for each topic
        const topicsWithReplies = await Promise.all(
          topicsData.map(async (topic) => {
            const { count } = await supabase
              .from("discussion_replies")
              .select("*", { count: "exact", head: true })
              .eq("topic_id", topic.id)

            return {
              ...topic,
              reply_count: count || 0,
            }
          }),
        )

        setTopics(topicsWithReplies)
      } catch (error) {
        console.error("Error fetching discussion data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, isLecturer])

  const handleFormChange = (name: string, value: string) => {
    setTopicForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      const { data, error } = await supabase
        .from("discussion_topics")
        .insert({
          course_id: topicForm.course_id,
          title: topicForm.title,
          content: topicForm.content,
          created_by: user.id,
        })
        .select()

      if (error) throw error

      // Get course details
      const { data: courseData } = await supabase.from("courses").select("title").eq("id", topicForm.course_id).single()

      // Add the new topic to the list
      setTopics((prev) => [
        {
          ...data[0],
          course: {
            id: topicForm.course_id,
            title: courseData?.title || "",
          },
          creator: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
          },
          reply_count: 0,
        },
        ...prev,
      ])

      setDialogOpen(false)
      setTopicForm({
        course_id: "",
        title: "",
        content: "",
      })
    } catch (error) {
      console.error("Error creating discussion topic:", error)
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
          <h1 className="text-3xl font-bold tracking-tight">Discussion Forums</h1>
          <p className="text-muted-foreground">Engage in course discussions with peers and instructors</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Discussion Topic</DialogTitle>
                <DialogDescription>Start a new discussion topic for your course.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="course">Course</Label>
                  <Select
                    value={topicForm.course_id}
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
                  <Label htmlFor="title">Topic Title</Label>
                  <Input
                    id="title"
                    value={topicForm.title}
                    onChange={(e) => handleFormChange("title", e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    rows={5}
                    value={topicForm.content}
                    onChange={(e) => handleFormChange("content", e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Topic</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {topics.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Discussion Topics</h2>
          <p className="mt-2 text-muted-foreground">
            Start a new discussion to engage with your peers and instructors.
          </p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Topic
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <Card key={topic.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{topic.title}</CardTitle>
                    <CardDescription>
                      {topic.course.title} • Posted {new Date(topic.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center rounded-full bg-muted px-3 py-1 text-sm">
                    <MessageSquare className="mr-1 h-3 w-3" />
                    {topic.reply_count} {topic.reply_count === 1 ? "reply" : "replies"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">{topic.content}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-2 h-4 w-4" />
                  <span>
                    {topic.creator.first_name} {topic.creator.last_name}
                    <span className="ml-1 text-xs capitalize">({topic.creator.role})</span>
                  </span>
                </div>
                <Button variant="outline" asChild>
                  <a href={`/dashboard/discussion/${topic.id}`}>View Discussion</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

