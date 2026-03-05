"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import CourseList from "../CourseList";
import CourseForm from "../CourseForm";
import CourseCard from "../CourseCard";
import CalendarView from "../CalendarView";

const categories = [
  "Pékeknek és pékségeknek",
  "Otthon sütőknek",
  "Moduláris képzéseink",
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

const isExpiredCourse = (course: Course): boolean => {
  if (!course.datetime) return false;
  const courseDate = new Date(course.datetime);
  if (Number.isNaN(courseDate.getTime())) return false;
  return courseDate.getTime() < Date.now();
};

const toLocalDateTimeInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getCloneDateTime = (originalDateTime?: string): string => {
  const now = new Date();
  const clonedDate = new Date(now);

  if (originalDateTime) {
    const originalDate = new Date(originalDateTime);
    if (!Number.isNaN(originalDate.getTime())) {
      clonedDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      return toLocalDateTimeInput(clonedDate);
    }
  }

  return toLocalDateTimeInput(now);
};

const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("Rendelések");
  const [showForm, setShowForm] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showKifliAnimation, setShowKifliAnimation] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null) => {
        setUser(currentUser);
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          try {
            const userDoc: DocumentSnapshot<DocumentData> = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsAdmin(userData?.isAdmin === true);
            } else {
              await setDoc(userDocRef, { isAdmin: false });
              setIsAdmin(false);
            }
          } catch (error) {
            console.error("Hiba a felhasznaloi adatok lekerese soran:", error);
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
        const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(collection(db, "courses"));
        const coursesData: Course[] = querySnapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            title: data.title || "Nincs cim",
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

        coursesData.sort((a, b) => {
          if (!a.datetime || !b.datetime) return 0;
          return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
        });

        setCourses(coursesData);
      } catch (error) {
        console.error("Hiba a tanfolyamok betoltese soran:", error);
        alert("Hiba tortent a tanfolyamok betoltese kozben.");
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
      setShowLoginModal(false);
      setShowKifliAnimation(true);
      triggerConfetti();
      setTimeout(() => setShowKifliAnimation(false), 2000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Hiba a Google bejelentkezes soran:", error.message);
        alert(`Hiba tortent a bejelentkezes kozben: ${error.message}`);
      } else {
        console.error("Ismeretlen hiba a Google bejelentkezes soran:", error);
        alert("Ismeretlen hiba tortent a bejelentkezes kozben.");
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
        console.error("Hiba a kijelentkezes soran:", error.message);
        alert(`Hiba tortent a kijelentkezes kozben: ${error.message}`);
      } else {
        console.error("Ismeretlen hiba a kijelentkezes soran:", error);
        alert("Ismeretlen hiba tortent a kijelentkezes kozben.");
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
      confetti.style.borderRadius =
        Math.random() > 0.5 ? "50%" : "20% 80% 20% 80% / 50% 50% 50% 50%";
      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
      }, 2000);
    }
  };

  const isCloneMode = showForm.startsWith("clone:");
  const selectedCourseId =
    showForm === "new" ? "" : isCloneMode ? showForm.replace("clone:", "") : showForm;

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  const clonedCourse = useMemo(() => {
    if (!isCloneMode || !selectedCourse) return undefined;
    return {
      ...selectedCourse,
      id: undefined,
      datetime: getCloneDateTime(selectedCourse.datetime),
      registeredUsers: [],
    };
  }, [isCloneMode, selectedCourse]);

  const formCourse = isCloneMode ? clonedCourse : selectedCourse;
  const formMode = showForm === "new" || isCloneMode ? "create" : "edit";

  const visibleCourses = isAdmin ? courses : courses.filter((course) => !isExpiredCourse(course));
  const coursesForTab =
    activeTab === "Rendelések"
      ? visibleCourses
      : visibleCourses.filter((course) => course.categories.includes(activeTab));

  const activeCoursesInTab = coursesForTab.filter((course) => !isExpiredCourse(course));
  const expiredCoursesInTab = isAdmin
    ? coursesForTab.filter((course) => isExpiredCourse(course))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-100 to-green-100">
        <img src="/logo.png" alt="Pekmester Logo" className="w-48 mb-8" />
        <p className="text-xl font-semibold text-gray-800">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="absolute top-4 right-4 z-40">
        {user ? (
          <div className="flex items-center gap-4">
            <p className="text-lg font-semibold text-gray-800">{user.displayName}</p>
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

      <img src="/logo.png" alt="Kovasz Akademia Logo" className="w-48 mx-auto mt-4" />

      <div className="p-6 flex gap-6">
        <div className="w-80 flex flex-col gap-4">
          <CourseList
            courses={visibleCourses}
            isAdmin={isAdmin}
            setShowForm={setShowForm}
            setCourses={setCourses}
            user={user}
            setShowLoginModal={setShowLoginModal}
          />
          <CalendarView
            courses={visibleCourses}
            isAdmin={isAdmin}
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
                className={`px-3 py-1.5 m-1 text-sm font-semibold rounded-md transition-all duration-200 hover:cursor-pointer hover:bg-[var(--third)]/70 ${
                  activeTab === label
                    ? "bg-[var(--fifth)] text-[var(--second)]"
                    : "bg-[var(--fifth)]/60 text-[var(--second)]"
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
                    ? "bg-[var(--fourth)] text-[var(--second)]"
                    : "bg-[var(--fourth)] text-[var(--second)] hover:bg-[var(--fourth)]/70"
                }`}
              >
                + Új tanfolyam
              </button>
            )}
          </div>

          {showForm ? (
            <CourseForm
              mode={formMode}
              course={formCourse}
              setCourses={setCourses}
              setShowForm={setShowForm}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="bg-white p-4 shadow rounded-md min-h-[100px]">
              <h2 className="text-lg font-bold mb-2 text-gray-800">{activeTab}</h2>

              {activeCoursesInTab.length === 0 && expiredCoursesInTab.length === 0 ? (
                <p className="text-gray-600">Nincs tanfolyam ebben a kategóriában.</p>
              ) : (
                <>
                  {activeCoursesInTab.length > 0 && (
                    <ul className="space-y-2">
                      {activeCoursesInTab.map((course) => (
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

                  {isAdmin && expiredCoursesInTab.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-md font-bold text-gray-700 mb-2">Lejárt kurzusok</h3>
                      <ul className="space-y-2">
                        {expiredCoursesInTab.map((course) => (
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
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-xl max-w-sm w-full border border-white/20">
            <h2 className="text-xl font-bold text-white text-center mb-7">Bejelentkezés szükséges</h2>
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
            <p className="text-yellow-600 text-lg font-bold text-center">Sikeres bejelentkezés!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tabs;


