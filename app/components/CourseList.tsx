"use client";

import React from "react";
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

interface Props {
  courses: Course[];
  isAdmin: boolean;
  setShowForm: (form: string) => void;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

const CourseList: React.FC<Props> = ({ courses, isAdmin, setShowForm, setCourses }) => {
  return (
    <div className="w-80 bg-white p-4 rounded-lg shadow-lg max-h-[calc(100vh-400px)] overflow-y-auto">
      <h3 className="text-lg font-bold mb-2">Összes tanfolyam</h3>
      {courses.length === 0 ? (
        <p>Nincs tanfolyam.</p>
      ) : (
        <ul className="space-y-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isAdmin={isAdmin}
              setCourses={setCourses}
              setShowForm={setShowForm}
              hideAdminActions={true} // Admin gombok elrejtése
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default CourseList;