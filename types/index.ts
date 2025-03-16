export type UserRole = "lecturer" | "student"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
}

// Course types
export type Course = {
  id: string
  title: string
  description: string
  lecturer_id: string
  created_at: string
  lecturer?: {
    first_name: string
    last_name: string
  }
  student_count?: number
}

// Material types
export interface Material {
  id: string
  title: string
  description: string
  file_url: string
  file_type: string
  created_at: string
}

// Assignment types
export interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  max_score: number
  course_id: string
  file_url?: string
  created_at: string
  course?: {
    id: string
    title: string
  }
  submission?:
    | {
        id: string
        submitted_at: string
        score: number | null
      }
    | Array<{
        id: string
        submitted_at: string
        score: number | null
      }>
}

// Student types
export interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  courses?: string[]
  courseIds?: string[]
}

// Attendance types
export interface AttendanceSession {
  id: string
  course_id: string
  session_date: string
  course: {
    title: string
  }
  attendance_count?: number
  total_students?: number
  student_status?: "present" | "absent" | "late"
}

// Discussion types
export interface DiscussionTopic {
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

// Notification types
export interface Notification {
  id: string
  title: string
  content: string
  is_read: boolean
  related_entity_type: string
  related_entity_id: string
  created_at: string
}

// Stats types
export interface DashboardStats {
  courses: number
  assignments: number
  students: number
  attendanceRate: number
}

