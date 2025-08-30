"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebase";
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
  maxCapacity: number;
  registeredUsers: { uid: string; displayName: string }[];
}

const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("Rendelések");
  const [showForm, setShowForm] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [animateIn, setAnimateIn] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showKifliAnimation, setShowKifliAnimation] = useState<boolean>(false);
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
            maxCapacity: data.maxCapacity || 0,
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

  useEffect(() => {
    setAnimateIn(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
      setShowKifliAnimation(true);
      triggerConfetti();
      setTimeout(() => setShowKifliAnimation(false), 2000); // Szinkronizálva a konfettivel
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Hiba a Google bejelentkezés során:", error.message);
        alert(`Hiba történt a bejelentkezés közben: ${error.message}`);
      } else {
        console.error("Ismeretlen hiba a Google bejelentkezés során:", error);
        alert("Ismeretlen hiba történt a bejelentkezés közben.");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Hiba a kijelentkezés során:", error.message);
        alert(`Hiba történt a kijelentkezés közben: ${error.message}`);
      } else {
        console.error("Ismeretlen hiba a kijelentkezés során:", error);
        alert("Ismeretlen hiba történt a kijelentkezés közben.");
      }
    }
  };

  const triggerConfetti = () => {
    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.top = `${Math.random() * 100}vh`;
      confetti.style.backgroundColor = `hsl(${Math.random() * 60 + 30}, 70%, 50%)`;
      confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "20% 80% 20% 80% / 50% 50% 50% 50%";
      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-100 to-green-100">
        <img src="/logo.png" alt="Pékmester Logo" className="w-48 mb-8" />
        <p className="text-xl font-semibold text-gray-800">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        {user ? (
          <div className="flex items-center gap-4">
            <p className="text-lg font-semibold text-gray-800">
              {user.displayName}
            </p>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow"
            >
              Kijelentkezés
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogleSignIn}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow"
          >
            Bejelentkezés
          </button>
        )}
      </div>
      <img src="/logo.png" alt="Kovász Akadémia Logó" className="w-48 mx-auto mt-4" />
      <div className="p-6 flex gap-6">
        <div className="w-80 flex flex-col gap-4">
          <CourseList
            courses={courses}
            isAdmin={isAdmin}
            setShowForm={setShowForm}
            setCourses={setCourses}
            user={user}
            setShowLoginModal={setShowLoginModal}
          />
          <CalendarView
            courses={courses}
            user={user}
            setShowLoginModal={setShowLoginModal}
          />
        </div>
        <div className="flex-1">
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
              <h2 className="text-lg font-bold mb-2 text-gray-800">
                {activeTab}
              </h2>
              {courses.filter((course) => course.categories.includes(activeTab))
                .length === 0 ? (
                <p className="text-gray-600">
                  Nincs tanfolyam ebben a kategóriában.
                </p>
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
                        setShowLoginModal={setShowLoginModal}
                        user={user}
                        hideAdminActions={false}
                      />
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-xl max-w-sm w-full border border-white/20">
            <h2 className="text-xl font-bold text-white text-center mb-7">
              Bejelentkezés szükséges
            </h2>
            <p className="text-gray-200 mb-10">
              Kérjük, jelentkezzen be Google fiókjával a tanfolyam részleteinek
              megtekintéséhez vagy foglaláshoz.
            </p>
            <div className="grid justify-center space-y-5">
              <button
                onClick={handleGoogleSignIn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Bejelentkezés Google-lel
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 mb-3"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
      {showKifliAnimation && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60 flex flex-col items-center">
          <div className="bg-white/30 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-yellow-200 animate-fade-in">
            <p className="text-yellow-600 text-lg font-bold text-center">
              Sikeres bejelentkezés!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tabs;