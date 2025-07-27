"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db, auth } from "../../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
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

const CourseDetails: React.FC = () => {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [currentImg, setCurrentImg] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data()?.isAdmin === true);
          }
        } catch (error) {
          console.error("Hiba az admin státusz lekérése során:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (id && typeof id === "string") {
      const fetchCourse = async () => {
        try {
          const docRef = doc(db, "courses", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const courseData: Course = {
              id: docSnap.id,
              title: data.title || "Nincs cím",
              price: data.price || 0,
              instructor: data.instructor,
              location: data.location,
              lead: data.lead || "",
              description: data.description,
              categories: data.categories || [],
              datetime: data.datetime,
              images: data.images,
              maxCapacity: data.maxCapacity || 8,
              registeredUsers: data.registeredUsers || [],
            };
            setCourse(courseData);
            if (user) {
              setIsRegistered(
                courseData.registeredUsers.some((u) => u.uid === user.uid)
              );
            }
          } else {
            console.log("Nincs ilyen tanfolyam!");
          }
        } catch (error) {
          console.error("Hiba a tanfolyam betöltése során:", error);
        }
        setLoading(false);
      };
      fetchCourse();
    } else {
      console.error("Érvénytelen vagy hiányzó ID!");
      setLoading(false);
    }
  }, [id, user]);

  const handleRegister = async () => {
    if (authLoading) {
      alert("Kérlek várj, a hitelesítési állapot még betöltés alatt!");
      return;
    }
    if (!user || !user.uid) {
      alert("Bejelentkezés szükséges a jelentkezéshez!");
      return;
    }
    if (!course?.id) {
      alert("Érvénytelen kurzus!");
      return;
    }
    if (course.registeredUsers.length >= course.maxCapacity) {
      alert("A kurzus betelt!");
      return;
    }
    try {
      const courseRef = doc(db, "courses", course.id);
      const courseSnap = await getDoc(courseRef);
      if (!courseSnap.exists()) {
        alert("A kurzus nem létezik!");
        return;
      }
      const currentUsers = courseSnap.data().registeredUsers || [];
      if (
        currentUsers.some(
          (u: { uid: string; displayName: string }) => u.uid === user.uid
        )
      ) {
        alert("Már jelentkeztél erre a kurzusra!");
        return;
      }
      await updateDoc(courseRef, {
        registeredUsers: arrayUnion({
          uid: user.uid,
          displayName: user.displayName || "Névtelen",
        }),
      });
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              registeredUsers: [
                ...prev.registeredUsers,
                { uid: user.uid, displayName: user.displayName || "Névtelen" },
              ],
            }
          : prev
      );
      setIsRegistered(true);
      alert("Sikeres jelentkezés!");
    } catch (error: unknown) {
      console.error("Hiba a jelentkezés során:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ismeretlen hiba";
      alert(`Hiba történt a jelentkezés közben: ${errorMessage}`);
    }
  };

  const handleUnregister = async () => {
    if (authLoading) {
      alert("Kérlek várj, a hitelesítési állapot még betöltés alatt!");
      return;
    }
    if (!user || !user.uid || !course?.id) {
      alert("Érvénytelen kurzus vagy felhasználó!");
      return;
    }
    try {
      const courseRef = doc(db, "courses", course.id);
      const courseSnap = await getDoc(courseRef);
      if (!courseSnap.exists()) {
        alert("A kurzus nem létezik!");
        return;
      }
      if (
        courseSnap
          .data()
          .registeredUsers?.some(
            (u: { uid: string; displayName: string }) => u.uid === user.uid
          )
      ) {
        await updateDoc(courseRef, {
          registeredUsers: arrayRemove({
            uid: user.uid,
            displayName: user.displayName || "Névtelen",
          }),
        });
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                registeredUsers: prev.registeredUsers.filter(
                  (u: { uid: string; displayName: string }) =>
                    u.uid !== user.uid
                ),
              }
            : prev
        );
        setIsRegistered(false);
        alert("Jelentkezés sikeresen visszavonva!");
      } else {
        alert("Nem vagy jelentkezve erre a kurzusra!");
      }
    } catch (error: unknown) {
      console.error("Hiba a jelentkezés visszavonása során:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ismeretlen hiba";
      alert(`Hiba történt a jelentkezés visszavonása közben: ${errorMessage}`);
    }
  };

  if (authLoading || loading) {
    return <div className="p-6 text-center">Betöltés...</div>;
  }

  if (!course) {
    return <div className="p-6 text-center">Tanfolyam nem található!</div>;
  }

  const imgs = course.images || [];
  const remainingSpots = course.maxCapacity - course.registeredUsers.length;
  const isFull = remainingSpots <= 0;

  return (
    <div className="p-6 max-w-5xl mx-auto flex gap-6">
      <div className="w-2/3">
        <div className="relative bg-gray-200 h-64 rounded-md mb-4 overflow-hidden">
          {imgs.length > 0 ? (
            <>
              <img
                src={imgs[currentImg]}
                alt={`Kép ${currentImg + 1}`}
                className="object-cover w-full h-full"
              />
              {/* Prev gomb */}
              {imgs.length > 1 && (
                <button
                  onClick={() =>
                    setCurrentImg((i) => (i - 1 + imgs.length) % imgs.length)
                  }
                  className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black/30 text-white p-1 rounded-full"
                >
                  ‹
                </button>
              )}
              {/* Next gomb */}
              {imgs.length > 1 && (
                <button
                  onClick={() => setCurrentImg((i) => (i + 1) % imgs.length)}
                  className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black/30 text-white p-1 rounded-full"
                >
                  ›
                </button>
              )}
              {/* kis előnézet pöttyök */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {imgs.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className={`w-2 h-2 rounded-full cursor-pointer ${
                      idx === currentImg ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 flex items-center justify-center h-full">
              Sajnáljuk, de erről a kurzusról nem tudunk képet mutatni.
            </p>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
        <p className="text-gray-600 mb-4">{course.lead}</p>
        <h2 className="text-lg font-semibold mb-2">Leírás</h2>
        <p className="text-gray-600 mb-4">
          {course.description || "Nincs részletes leírás."}
        </p>
        <h2 className="text-lg font-semibold mb-2">Felszerelés</h2>
        <p className="text-gray-600">
          Hozd magaddal: kenyérsütő forma, kötény, jegyzetfüzet.
        </p>
      </div>
      <div className="w-1/3 bg-white p-4 rounded-lg shadow-lg sticky top-4">
        <h2 className="text-lg font-bold mb-2">Tanfolyam adatai</h2>
        <p className="text-gray-600 mb-2">
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
        <p className="text-gray-600 mb-2">Ár: {course.price} Ft</p>
        <p
          className={`text-lg mb-4 ${
            isFull ? "text-red-500" : "text-green-500"
          }`}
        >
          {isFull ? "Betelt!" : `Már csak ${remainingSpots} hely van!`}
        </p>
        {!isFull && !isRegistered && (
          <button
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mb-2 disabled:opacity-50"
            onClick={handleRegister}
            disabled={authLoading || !user}
          >
            Jelentkezés
          </button>
        )}
        {isRegistered && (
          <button
            className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 mb-2 disabled:opacity-50"
            onClick={handleUnregister}
            disabled={authLoading}
          >
            Jelentkezés visszavonása
          </button>
        )}
        <button
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          onClick={() => alert("Fizetési funkció később lesz implementálva!")}
        >
          Fizetés
        </button>
        {isAdmin && course.registeredUsers.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Jelentkezők</h3>
            <ul className="list-disc pl-5">
              {course.registeredUsers.map((user, index) => (
                <li key={index} className="text-gray-600">
                  {user.displayName || "Névtelen"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
