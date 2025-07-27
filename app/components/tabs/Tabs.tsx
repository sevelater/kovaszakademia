"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebase"; // Igazítsd a saját elérési utadhoz
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import CourseList from "../CourseList";
import CourseForm from "../CourseForm";
import CourseCard from "../CourseCard";
import CalendarView from "../CalendarView";

const categories = [
  "Pékeknek és pékségeknek",
  "Otthon sütőknek",
  "Moduláris képzésünk",
  "Mesterkurzusok",
  "Üzleti tanácsadás pékségeknek",
  "Oktatói franchise",
];

export interface Course {
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
  registeredUsers: { uid: string; displayName: string }[]; // Kötelező, üres tömb alapértelmezetten
}

const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("Rendelések");
  const [showForm, setShowForm] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null) => {
        setUser(currentUser);
        if (currentUser) {
          console.log("Bejelentkezett felhasználó UID:", currentUser.uid);
          const userDocRef = doc(db, "users", currentUser.uid);
          try {
            const userDoc: DocumentSnapshot<DocumentData> = await getDoc(
              userDocRef
            );
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log("Felhasználó adatai:", userData);
              setIsAdmin(userData?.isAdmin === true);
            } else {
              console.log("Nincs users dokumentum, létrehozzuk...");
              await setDoc(userDocRef, { isAdmin: false });
              setIsAdmin(false);
            }
          } catch (error) {
            console.error("Hiba a felhasználói adatok lekérése során:", error);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(
          collection(db, "courses")
        );
        const coursesData: Course[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Nincs cím",
            price: data.price || 0,
            instructor: data.instructor,
            location: data.location,
            lead: data.lead || "",
            description: data.description,
            categories: data.categories || [],
            datetime: data.datetime,
            images: data.images,
            maxCapacity: data.maxCapacity || "",
            registeredUsers: data.registeredUsers || [],
          };
        });
        console.log("Betöltött tanfolyamok:", coursesData);
        coursesData.sort((a, b) => {
          if (!a.datetime || !b.datetime) return 0;
          return (
            new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          );
        });
        setCourses(coursesData);
      } catch (error) {
        console.error("Hiba a tanfolyamok betöltése során:", error);
        alert("Hiba történt a tanfolyamok betöltése közben.");
      }
    };
    fetchCourses();
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Hiba a Google bejelentkezés során:", error);
      alert("Hiba történt a bejelentkezés közben.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Hiba a kijelentkezés során:", error);
      alert("Hiba történt a kijelentkezés közben.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p>Betöltés...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Bejelentkezés szükséges</h2>
        <button
          onClick={handleGoogleSignIn}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer"
        >
          Bejelentkezés Google-lel
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex gap-6">
      <div className="w-80 flex flex-col gap-4">
        <CourseList
          courses={courses}
          isAdmin={isAdmin}
          setShowForm={setShowForm}
          setCourses={setCourses}
        />
        <CalendarView courses={courses} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <p className="mr-1.5">Üdv, {user.displayName}! </p>
          <p>{isAdmin && "(Admin)"}</p>
          <button
            onClick={handleSignOut}
            className="ml-5 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Kijelentkezés
          </button>
        </div>
        <div className="flex flex-wrap mb-6">
          {["Rendelések", ...categories].map((label) => (
            <button
              key={label}
              onClick={() => {
                setActiveTab(label);
                setShowForm("");
              }}
              className={`px-3 py-1.5 m-1 text-sm font-semibold rounded-md transition-all duration-200 hover:cursor-pointer hover:bg-[var(--third)]/40 ${
                activeTab === label
                  ? "bg-[var(--third)]/40 text-white"
                  : "bg-[var(--second)]/40 text-black/70"
              }`}
            >
              {label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => {
                setShowForm("new");
                setActiveTab("Új tanfolyam");
              }}
              className={`px-3 py-1.5 m-1 text-sm font-semibold rounded-md transition-all duration-200 hover:cursor-pointer ${
                showForm === "new"
                  ? "bg-green-600 text-white"
                  : "bg-green-500 text-black hover:bg-green-500/70"
              }`}
            >
              + Új tanfolyam
            </button>
          )}
        </div>
        {showForm ? (
          <CourseForm
            mode={showForm === "new" ? "create" : "edit"}
            course={
              showForm === "new"
                ? undefined
                : courses.find((c) => c.id === showForm)
            }
            setCourses={setCourses}
            setShowForm={setShowForm}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="bg-white p-4 shadow rounded-md min-h-[100px]">
            <h2 className="text-lg font-bold mb-2">{activeTab}</h2>
            {courses.filter((course) => course.categories.includes(activeTab))
              .length === 0 ? (
              <p>Nincs tanfolyam ebben a kategóriában.</p>
            ) : (
              <ul className="space-y-2">
                {courses
                  .filter((course) => course.categories.includes(activeTab))
                  .map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isAdmin={isAdmin}
                      setCourses={setCourses}
                      setShowForm={setShowForm}
                      hideAdminActions={false}
                    />
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tabs;
