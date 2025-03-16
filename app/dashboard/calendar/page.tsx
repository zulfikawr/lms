"use client"

import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Sample events data
const sampleEvents = [
  {
    id: "1",
    title: "Web Development Lecture",
    date: new Date(2023, 5, 15, 10, 0),
    type: "lecture",
  },
  {
    id: "2",
    title: "Database Systems Assignment Due",
    date: new Date(2023, 5, 18, 23, 59),
    type: "assignment",
  },
  {
    id: "3",
    title: "Computer Networks Lab",
    date: new Date(2023, 5, 20, 14, 0),
    type: "lab",
  },
  {
    id: "4",
    title: "Mid-term Exam",
    date: new Date(2023, 5, 25, 9, 0),
    type: "exam",
  },
]

export default function CalendarPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const isLecturer = user?.role === "lecturer"

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get day of week for first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return sampleEvents.filter(
      (event) =>
        event.date.getFullYear() === date.getFullYear() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getDate() === date.getDate(),
    )
  }

  // Check if a date has events
  const hasEvents = (date: Date) => {
    return getEventsForDate(date).length > 0
  }

  // Render calendar grid
  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 border border-transparent p-1"></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateString = formatDate(date)
      const isToday = new Date().toDateString() === date.toDateString()
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString()
      const hasEventsForDate = hasEvents(date)

      days.push(
        <div
          key={dateString}
          className={`h-12 cursor-pointer border p-1 transition-colors hover:bg-muted ${
            isToday ? "bg-blue-50 font-bold" : ""
          } ${isSelected ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className="flex h-full flex-col justify-between">
            <span className="text-sm">{day}</span>
            {hasEventsForDate && (
              <div className="flex justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              </div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">View and manage your academic schedule</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl">
                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-7 gap-0">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="p-1 text-center text-sm font-medium">
                      {day}
                    </div>
                  ))}
                  {renderCalendarDays()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                  : "Events"}
              </CardTitle>
              <CardDescription>
                {selectedDate
                  ? `${getEventsForDate(selectedDate).length} events scheduled`
                  : "Select a date to view events"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                getEventsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-4">
                    {getEventsForDate(selectedDate).map((event) => (
                      <div key={event.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{event.title}</h3>
                          <Badge
                            className={
                              event.type === "lecture"
                                ? "bg-blue-100 text-blue-800"
                                : event.type === "assignment"
                                  ? "bg-amber-100 text-amber-800"
                                  : event.type === "exam"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                            }
                          >
                            {event.type}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Events</h3>
                    <p className="mt-1 text-sm text-muted-foreground">There are no events scheduled for this date.</p>
                  </div>
                )
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Select a Date</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Click on a date to view scheduled events.</p>
                </div>
              )}

              {isLecturer && selectedDate && <Button className="mt-4 w-full">Add Event</Button>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

