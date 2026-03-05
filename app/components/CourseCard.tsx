"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import { deleteDoc, doc } from "firebase/firestore";
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
  images?: string[];
  maxCapacity: number;
  registeredUsers: { uid: string; displayName: string }[];
}

interface Props {
  course: Course;
  isAdmin: boolean;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setShowForm: (form: string) => void;
  setShowLoginModal?: React.Dispatch<React.SetStateAction<boolean>>;
  user?: User | null;
  hideAdminActions?: boolean;
}

const CourseCard: React.FC<Props> = ({
  course,
  isAdmin,
  setCourses,
  setShowForm,
  setShowLoginModal,
  user,
  hideAdminActions,
}) => {
  const router = useRouter();
  const [showRegistrantInfo, setShowRegistrantInfo] = useState(false);

  useEffect(() => {
    if (course.id) {
      router.prefetch(`/courses/${course.id}`);
    }
  }, [course.id, router]);

  const isExpired = useMemo(() => {
    if (!course.datetime) return false;
    const courseDate = new Date(course.datetime);
    if (Number.isNaN(courseDate.getTime())) return false;
    return courseDate.getTime() < Date.now();
  }, [course.datetime]);

  const handleDelete = async () => {
    if (!isAdmin) {
      alert("Nincs jogosultsagod tanfolyamot torolni!");
      return;
    }

    try {
      if (course.id) {
        await deleteDoc(doc(db, "courses", course.id));
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        alert("Tanfolyam sikeresen torolve!");
      } else {
        console.error("A tanfolyam ID-ja hianyzik!");
        alert("Hiba: A tanfolyam ID-ja hianyzik!");
      }
    } catch (error) {
      console.error("Hiba a tanfolyam torlese soran:", error);
      alert("Hiba tortent a tanfolyam torlese kozben.");
    }
  };

  const handleNavigation = () => {
    if (isAdmin && isExpired && course.id) {
      setShowForm(`clone:${course.id}`);
      return;
    }

    if (setShowLoginModal && !user) {
      setShowLoginModal(true);
    } else if (course.id) {
      router.push(`/courses/${course.id}`);
    } else {
      console.error("A tanfolyam ID-ja hianyzik a navigaciohoz!");
      alert("Hiba: Nem lehet navigalni, mert a tanfolyam ID-ja hianyzik!");
    }
  };

  const remainingSpots =
    course.maxCapacity && course.registeredUsers
      ? course.maxCapacity - course.registeredUsers.length
      : null;
  const isFull = remainingSpots !== null && remainingSpots <= 0;

  return (
    <li
      className={`relative border p-3 rounded-md bg-gray-50 flex justify-between items-start cursor-pointer hover:bg-gray-100 ${
        isExpired && isAdmin ? "opacity-80" : ""
      }`}
      onClick={handleNavigation}
      onMouseEnter={() => {
        if (course.id) {
          router.prefetch(`/courses/${course.id}`);
        }
      }}
    >
      {isAdmin && (
        <div className="absolute right-2 top-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRegistrantInfo((prev) => !prev);
            }}
            className="w-6 h-6 rounded-full border-2 border-blue-500 text-blue-600 text-xs font-bold bg-white hover:bg-blue-50"
            title="Jelentkezok"
          >
            i
          </button>
          {showRegistrantInfo && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-blue-100 rounded-md shadow-lg p-2 z-20">
              <p className="text-xs font-semibold text-blue-700 mb-1">Jelentkezők</p>
              {course.registeredUsers.length === 0 ? (
                <p className="text-xs text-gray-600">Nincs jelentkező.</p>
              ) : (
                <ul className="text-xs text-gray-700 space-y-1 max-h-28 overflow-auto">
                  {course.registeredUsers.map((registeredUser) => (
                    <li key={registeredUser.uid}>{registeredUser.displayName || "Nevtelen"}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 pr-8">
        <h3 className={`text-lg font-semibold ${isExpired && isAdmin ? "line-through" : ""}`}>{course.title}</h3>
        <p className={`text-sm text-gray-600 ${isExpired && isAdmin ? "line-through" : ""}`}>
          Ár: {course.price} Ft | Oktató: {course.instructor || "Nincs megadva"}
        </p>
        <p className={`text-sm text-gray-600 ${isExpired && isAdmin ? "line-through" : ""}`}>
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
        <p className={`text-sm mt-1 ${isExpired && isAdmin ? "line-through" : ""}`}>{course.lead}</p>
        {course.maxCapacity && (
          <p className="text-sm text-gray-600 mt-1">
            Helyek:{" "}
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs ${
                isFull ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
              }`}
            >
              {isFull ? "Betelt" : `${remainingSpots}/${course.maxCapacity}`}
            </span>
          </p>
        )}
      </div>

      {isAdmin && !hideAdminActions && (
        <div className="flex flex-col gap-2 ml-4 pt-6">
          {isExpired ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (course.id) {
                    setShowForm(`clone:${course.id}`);
                  } else {
                    alert("Hiba: A tanfolyam ID-ja hianyzik!");
                  }
                }}
                className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-sm"
              >
                Új kurzus ezekkel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-sm"
              >
                Kurzus törlése
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (course.id) {
                    setShowForm(course.id);
                  } else {
                    alert("Hiba: A tanfolyam ID-ja hianyzik!");
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
                Törles
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

export default CourseCard;
