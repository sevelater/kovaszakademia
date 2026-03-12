"use client";

import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import CourseCard from "./ExpiredCourse";
import { User } from "firebase/auth";

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
  endDatetime?: string;
  sessions?: { start: string; end: string }[];
  images?: string[];
  maxCapacity: number;
  registeredUsers: { uid: string; displayName: string }[];
}

type Props = {
  courses: Course[];
  isAdmin: boolean;
  user: User | null;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
};

const getCourseSessions = (course: Course): { start: string; end: string }[] => {
  if (course.sessions && course.sessions.length > 0) {
    return course.sessions.filter((session) => session.start);
  }
  if (!course.datetime) return [];
  const start = course.datetime;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return [];
  const end =
    course.endDatetime ||
    new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
  return [{ start, end }];
};

const isExpiredCourse = (course: Course): boolean => {
  const sessions = getCourseSessions(course);
  if (sessions.length === 0) return false;
  const lastEnd = sessions
    .map((session) => new Date(session.end))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!lastEnd) return false;
  return lastEnd.getTime() < Date.now();
};

type SelectedCourse = {
  course: Course;
  sessionStart?: string;
  sessionEnd?: string;
};

export default function CalendarView({ courses, isAdmin, user, setShowLoginModal }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);

  const visibleCourses = courses.filter((course) => !isExpiredCourse(course));

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === "month") {
      const courseDates = visibleCourses.flatMap((course) => {
        const sessions = getCourseSessions(course);
        return sessions
          .filter((session) => {
            const courseDate = new Date(session.start);
            if (Number.isNaN(courseDate.getTime())) return false;
            return (
              courseDate.getFullYear() === date.getFullYear() &&
              courseDate.getMonth() === date.getMonth() &&
              courseDate.getDate() === date.getDate()
            );
          })
          .map((session) => ({ course, session }));
      });

      if (courseDates.length > 0) {
        return (
          <div className="relative">
            {courseDates.map(({ course, session }, index) => {
              const isFull = course.maxCapacity && course.registeredUsers
                ? course.registeredUsers.length >= course.maxCapacity
                : false;
              const startTime = new Date(session.start);
              const endTime = new Date(session.end);
              return (
                <div
                  key={index}
                  className={`absolute bottom-0 left-0 w-2 h-2 rounded-full ${isFull ? "bg-red-500" : "bg-green-500"}`}
                  style={{ left: `${index * 4}px` }}
                  title={`${course.title} - ${startTime.toLocaleTimeString("hu-HU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}${
                    Number.isNaN(endTime.getTime())
                      ? ""
                      : `–${endTime.toLocaleTimeString("hu-HU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                  } ${isFull ? "(Betelt)" : ""}`}
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
    const filteredCourses = visibleCourses.flatMap((course) => {
      const sessions = getCourseSessions(course);
      return sessions
        .filter((session) => {
          const courseDate = new Date(session.start);
          if (Number.isNaN(courseDate.getTime())) return false;
          return (
            courseDate.getFullYear() === date.getFullYear() &&
            courseDate.getMonth() === date.getMonth() &&
            courseDate.getDate() === date.getDate()
          );
        })
        .map((session) => ({
          course,
          sessionStart: session.start,
          sessionEnd: session.end,
        }));
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
            const hasCourse = visibleCourses.some((course) => {
              const sessions = getCourseSessions(course);
              return sessions.some((session) => {
                const courseDate = new Date(session.start);
                if (Number.isNaN(courseDate.getTime())) return false;
                return (
                  courseDate.getFullYear() === date.getFullYear() &&
                  courseDate.getMonth() === date.getMonth() &&
                  courseDate.getDate() === date.getDate()
                );
              });
            });
            return hasCourse ? "bg-black" : null;
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
              {selectedCourses.slice(0, 2).map((entry) => (
                <CourseCard
                  key={`${entry.course.id}-${entry.sessionStart}`}
                  course={entry.course}
                  isAdmin={false}
                  setCourses={() => {}}
                  setShowForm={() => {}}
                  hideAdminActions={true}
                  user={user}
                  setShowLoginModal={setShowLoginModal}
                  displayStart={entry.sessionStart}
                  displayEnd={entry.sessionEnd}
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
