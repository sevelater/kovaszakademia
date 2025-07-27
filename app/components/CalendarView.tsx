"use client";

import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import CourseCard from "./CourseCard";

interface Course {
  id?: string;
  title: string;
  price: number;
  instructor?: string;
  location?: string;
  lead: string;
  description?: string;
  categories: string[];
  datetime?: string;
  images?: string[];
  maxCapacity: number; // Kötelező mező
  registeredUsers: { uid: string; displayName: string }[]; // Kötelező mező
}

type Props = {
  courses: Course[];
};

export default function CalendarView({ courses }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === "month") {
      const courseDates = courses.filter((course) => {
        if (!course.datetime) return false;
        const courseDate = new Date(course.datetime);
        return (
          courseDate.getFullYear() === date.getFullYear() &&
          courseDate.getMonth() === date.getMonth() &&
          courseDate.getDate() === date.getDate()
        );
      });
      if (courseDates.length > 0) {
        return (
          <div className="relative">
            {courseDates.map((course, index) => {
              const isFull = course.maxCapacity && course.registeredUsers
                ? course.registeredUsers.length >= course.maxCapacity
                : false;
              return (
                <div
                  key={index}
                  className={`absolute bottom-0 left-0 w-2 h-2 rounded-full ${isFull ? "bg-red-500" : "bg-green-500"}`}
                  style={{ left: `${index * 4}px` }}
                  title={`${course.title} - ${new Date(course.datetime!).toLocaleTimeString("hu-HU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} ${isFull ? "(Betelt)" : ""}`}
                />
              );
            })}
          </div>
        );
      }
    }
    return null;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const filteredCourses = courses.filter((course) => {
      if (!course.datetime) return false;
      const courseDate = new Date(course.datetime);
      return (
        courseDate.getFullYear() === date.getFullYear() &&
        courseDate.getMonth() === date.getMonth() &&
        courseDate.getDate() === date.getDate()
      );
    });
    setSelectedCourses(filteredCourses);
  };

  return (
    <div className="w-80 bg-white p-4 rounded-lg shadow-lg relative">
      <h3 className="text-lg font-bold mb-2">Tanfolyamok naptára</h3>
      <Calendar
        onClickDay={handleDayClick}
        tileContent={tileContent}
        className="border-none bg-white text-black"
        locale="hu-HU"
        tileClassName={({ date, view }) => {
          if (view === "month") {
            const hasCourse = courses.some((course) => {
              if (!course.datetime) return false;
              const courseDate = new Date(course.datetime);
              return (
                courseDate.getFullYear() === date.getFullYear() &&
                courseDate.getMonth() === date.getMonth() &&
                courseDate.getDate() === date.getDate()
              );
            });
            return hasCourse ? "bg-blue-100 rounded-full" : null;
          }
          return null;
        }}
      />
      {selectedDate && (
        <div className="fixed bottom-4 left-96 w-80 bg-white p-4 rounded-lg shadow-lg z-50">
          <h3 className="text-lg font-bold mb-2">
            Tanfolyamok {selectedDate.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
          </h3>
          {selectedCourses.length === 0 ? (
            <p>Nincs tanfolyam ezen a napon.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {selectedCourses.slice(0, 2).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isAdmin={false}
                  setCourses={() => {}}
                  setShowForm={() => {}}
                  hideAdminActions={true}
                />
              ))}
              {selectedCourses.length > 2 && (
                <p className="text-sm text-gray-600">További {selectedCourses.length - 2} tanfolyam...</p>
              )}
            </ul>
          )}
          <button
            onClick={() => setSelectedDate(null)}
            className="mt-2 px-4 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Bezár
          </button>
        </div>
      )}
    </div>
  );
}