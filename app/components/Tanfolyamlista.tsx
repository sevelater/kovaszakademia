"use client";

import React from "react";
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

interface Props {
  courses: Course[];
  isAdmin: boolean;
  setShowForm: (form: string) => void;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  user: User | null;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
}




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

const isCourseActive = (course: Course): boolean => {
  const sessions = getCourseSessions(course);
  if (sessions.length === 0) return true;
  const lastEnd = sessions
    .map((session) => new Date(session.end))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!lastEnd) return true;
  return lastEnd.getTime() >= Date.now();
};

const CourseList: React.FC<Props> = ({ courses, isAdmin, setShowForm, setCourses, user, setShowLoginModal }) => {
  
  const activeCourses = courses.filter((course) => isCourseActive(course));
  
  return (
    <div className="w-80 bg-white p-4 rounded-lg shadow-lg max-h-[calc(100vh-400px)] overflow-y-auto">
      <h3 className="text-lg font-bold mb-2">Összes tanfolyam</h3>
      {activeCourses.length === 0 ? (
        <p>Nincs tanfolyam.</p>
      ) : (
        <ul className="space-y-2">
          {activeCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isAdmin={isAdmin}
              setCourses={setCourses}
              setShowForm={setShowForm}
              hideAdminActions={true}
              user={user}
              setShowLoginModal={setShowLoginModal}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default CourseList;
