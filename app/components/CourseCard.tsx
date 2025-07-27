"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebase"; // Igazítsd a saját elérési utadhoz
import { deleteDoc, doc } from "firebase/firestore";

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
  course: Course;
  isAdmin: boolean;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setShowForm: (form: string) => void;
  hideAdminActions?: boolean;
}

const CourseCard: React.FC<Props> = ({ course, isAdmin, setCourses, setShowForm, hideAdminActions }) => {
  const router = useRouter();

  const handleDelete = async () => {
    if (!isAdmin) {
      alert("Nincs jogosultságod tanfolyamot törölni!");
      return;
    }
    try {
      if (course.id) {
        await deleteDoc(doc(db, "courses", course.id));
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        alert("Tanfolyam sikeresen törölve!");
      } else {
        console.error("A tanfolyam ID-ja hiányzik!");
        alert("Hiba: A tanfolyam ID-ja hiányzik!");
      }
    } catch (error) {
      console.error("Hiba a tanfolyam törlése során:", error);
      alert("Hiba történt a tanfolyam törlése közben.");
    }
  };

  const handleNavigation = () => {
    if (course.id) {
      console.log(`Navigálás ide: /courses/${course.id}`);
      router.push(`/courses/${course.id}`);
    } else {
      console.error("A tanfolyam ID-ja hiányzik a navigációhoz!");
      alert("Hiba: Nem lehet navigálni, mert a tanfolyam ID-ja hiányzik!");
    }
  };

  const remainingSpots = course.maxCapacity && course.registeredUsers
    ? course.maxCapacity - course.registeredUsers.length
    : null;
  const isFull = remainingSpots !== null && remainingSpots <= 0;

  return (
    <li
      className="border p-3 rounded-md bg-gray-50 flex justify-between items-start cursor-pointer hover:bg-gray-100"
      onClick={handleNavigation}
    >
      <div className="flex-1">
        <h3 className="text-lg font-semibold">{course.title}</h3>
        <p className="text-sm text-gray-600">
          Ár: {course.price} Ft | Oktató: {course.instructor || "Nincs megadva"}
        </p>
        <p className="text-sm text-gray-600">
          Időpont:{" "}
          {course.datetime
            ? new Date(course.datetime).toLocaleString("hu-HU", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Nincs megadva"}
        </p>
        <p className="text-sm mt-1">{course.lead}</p>
        {course.maxCapacity && (
          <p className="text-sm text-gray-600 mt-1">
            Helyek:{" "}
            <span className={`inline-block px-2 py-1 rounded-full text-xs ${isFull ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
              {isFull ? "Betelt" : `${remainingSpots}/${course.maxCapacity}`}
            </span>
          </p>
        )}
      </div>
      {isAdmin && !hideAdminActions && (
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (course.id) {
                setShowForm(course.id);
              } else {
                alert("Hiba: A tanfolyam ID-ja hiányzik!");
              }
            }}
            className="bg-yellow-500 text-white px-2 py-1 rounded-md hover:bg-yellow-600 text-sm"
          >
            Szerkesztés
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-sm"
          >
            Törlés
          </button>
        </div>
      )}
    </li>
  );
};

export default CourseCard;