"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db, auth } from "../../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
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
import CourseList from "../Tanfolyamlista";
import CourseForm from "../NewCourse";
import CourseCard from "../ExpiredCourse";
import CalendarView from "../Calendar";

const categories = [
  "Pékeknek és pékségeknek",
  "Otthon sütőknek",
  "Moduláris képzéseink",
  "Mesterkurzusok",
  "Üzleti tanácsadás pékségeknek",
  "Oktatói franchise",
];

type AdminSection = "Kurzusok" | "Jogosultság" | "Adatok";

interface ManagedUser {
  uid: string;
  isAdmin: boolean;
  displayName?: string;
  email?: string;
}

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
  endDatetime?: string;
  sessions?: { start: string; end: string }[];
  images?: string[];
  maxCapacity: number;
  registeredUsers: { uid: string; displayName: string }[];
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

const getCourseStartTime = (course: Course): number | null => {
  const sessions = getCourseSessions(course);
  if (sessions.length === 0) return null;
  const earliest = sessions
    .map((session) => new Date(session.start))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return earliest ? earliest.getTime() : null;
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
      clonedDate.setHours(
        originalDate.getHours(),
        originalDate.getMinutes(),
        0,
        0,
      );
      return toLocalDateTimeInput(clonedDate);
    }
  }

  return toLocalDateTimeInput(now);
};

const getCloneEndDateTime = (
  originalEndDateTime: string | undefined,
  fallbackStart: string,
): string => {
  const startDate = new Date(fallbackStart);
  if (Number.isNaN(startDate.getTime())) {
    return toLocalDateTimeInput(new Date());
  }

  if (originalEndDateTime) {
    const originalEnd = new Date(originalEndDateTime);
    if (!Number.isNaN(originalEnd.getTime())) {
      startDate.setHours(
        originalEnd.getHours(),
        originalEnd.getMinutes(),
        0,
        0,
      );
      return toLocalDateTimeInput(startDate);
    }
  }

  startDate.setHours(startDate.getHours() + 2);
  return toLocalDateTimeInput(startDate);
};

const isPermissionDenied = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  if (!("code" in error)) return false;
  return String((error as { code?: string }).code).includes(
    "permission-denied",
  );
};

const sortHu = (items: string[]): string[] =>
  [...items].sort((a, b) => a.localeCompare(b, "hu"));

const Tabs: React.FC = () => {
  const [adminSection, setAdminSection] = useState<AdminSection>("Kurzusok");
  const [activeTab, setActiveTab] = useState<string>(categories[0]);
  const [showForm, setShowForm] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showKifliAnimation, setShowKifliAnimation] = useState<boolean>(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");

  const [newInstructor, setNewInstructor] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");

  const [instructors, setInstructors] = useState<
    { id: string; name: string }[]
  >([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const instructorSnapshot = await getDocs(collection(db, "instructors"));
        const locationSnapshot = await getDocs(collection(db, "locations"));

        const instructorList = instructorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { name: string }),
        }));

        const locationList = locationSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { name: string }),
        }));

        setInstructors(
          instructorList.sort((a, b) => a.name.localeCompare(b.name, "hu")),
        );
        setLocations(
          locationList.sort((a, b) => a.name.localeCompare(b.name, "hu")),
        );
      } catch (error) {
        console.error("Hiba az adatok lekérésekor:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null) => {
        setUser(currentUser);
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          try {
            const userDoc: DocumentSnapshot<DocumentData> =
              await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsAdmin(userData?.isAdmin === true);
              await setDoc(
                userDocRef,
                {
                  displayName: currentUser.displayName || "",
                  email: currentUser.email || "",
                },
                { merge: true },
              );
            } else {
              await setDoc(userDocRef, {
                isAdmin: false,
                displayName: currentUser.displayName || "",
                email: currentUser.email || "",
              });
              setIsAdmin(false);
            }
          } catch (error) {
            if (!isPermissionDenied(error)) {
              console.error(
                "Hiba a felhasználói adatok lekérése során:",
                error,
              );
            }
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(
          collection(db, "courses"),
        );
          const coursesData: Course[] = querySnapshot.docs.map((docItem) => {
            const data = docItem.data();
            return {
              id: docItem.id,
              title: data.title || "Nincs cím",
              price: data.price || 0,
              instructor: data.instructor,
              location: data.location,
              lead: data.lead || "",
              description: data.description,
              categories: data.categories || [],
              datetime: data.datetime,
              endDatetime: data.endDatetime,
              sessions: data.sessions,
              images: data.images,
              maxCapacity: data.maxCapacity || 0,
              registeredUsers: data.registeredUsers || [],
            };
          });

          coursesData.sort((a, b) => {
            const aTime = getCourseStartTime(a);
            const bTime = getCourseStartTime(b);
            if (aTime === null || bTime === null) return 0;
            return aTime - bTime;
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
    const fetchManagedUsers = async () => {
      if (!isAdmin || adminSection !== "Jogosultság") return;
      try {
        const usersSnapshot: QuerySnapshot<DocumentData> = await getDocs(
          collection(db, "users"),
        );
        const userRows: ManagedUser[] = usersSnapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            uid: docItem.id,
            isAdmin: data?.isAdmin === true,
            displayName: data?.displayName || "",
            email: data?.email || "",
          };
        });

        userRows.sort((a, b) => {
          const aLabel = a.displayName || a.email || a.uid || "";
          const bLabel = b.displayName || b.email || b.uid || "";
          return aLabel.localeCompare(bLabel, "hu");
        });

        setManagedUsers(userRows);
      } catch (error) {
        if (!isPermissionDenied(error)) {
          console.error("Hiba a felhasználók betöltése során:", error);
        }
      }
    };

    fetchManagedUsers();
  }, [adminSection, isAdmin]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
      setShowKifliAnimation(true);
      triggerConfetti();
      setTimeout(() => setShowKifliAnimation(false), 2000);
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
    showForm === "new"
      ? ""
      : isCloneMode
        ? showForm.replace("clone:", "")
        : showForm;

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );

  const clonedCourse = useMemo(() => {
    if (!isCloneMode || !selectedCourse) return undefined;
    const clonedStart = getCloneDateTime(selectedCourse.datetime);
    return {
      ...selectedCourse,
      id: undefined,
      datetime: clonedStart,
      endDatetime: getCloneEndDateTime(
        selectedCourse.endDatetime,
        clonedStart,
      ),
      registeredUsers: [],
    };
  }, [isCloneMode, selectedCourse]);

  const formCourse = isCloneMode ? clonedCourse : selectedCourse;
  const formMode = showForm === "new" || isCloneMode ? "create" : "edit";

  const visibleCourses = isAdmin
    ? courses
    : courses.filter((course) => !isExpiredCourse(course));

  const coursesForTab =
    visibleCourses.filter((course) => course.categories.includes(activeTab));

  const activeCoursesInTab = coursesForTab.filter(
    (course) => !isExpiredCourse(course),
  );
  const expiredCoursesInTab = isAdmin
    ? coursesForTab.filter((course) => isExpiredCourse(course))
    : [];

  const filteredManagedUsers = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase();
    if (!term) return managedUsers;
    return managedUsers.filter((managedUser) => {
      const label = [
        managedUser.displayName || "",
        managedUser.email || "",
        managedUser.uid || "",
      ]
        .join(" ")
        .toLowerCase();
      return label.includes(term);
    });
  }, [managedUsers, userSearchTerm]);

  const toggleAdminPermission = async (
    uid: string,
    currentIsAdmin: boolean,
  ) => {
    if (user?.uid === uid && currentIsAdmin) {
      return;
    }

    try {
      await setDoc(
        doc(db, "users", uid),
        { isAdmin: !currentIsAdmin },
        { merge: true },
      );
      setManagedUsers((prev) =>
        prev.map((managedUser) =>
          managedUser.uid === uid
            ? { ...managedUser, isAdmin: !currentIsAdmin }
            : managedUser,
        ),
      );
    } catch (error) {
      if (isPermissionDenied(error)) {
        alert("Nincs jogosultságod ehhez a művelethez.");
        return;
      }
      console.error("Hiba a jogosultság módosítása során:", error);
      alert("Hiba történt a jogosultság módosításakor.");
    }
  };

  const addInstructor = async () => {
    const value = newInstructor.trim();
    if (!value) return;
    if (instructors.some((i) => i.name.toLowerCase() === value.toLowerCase())) {
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "instructors"), {
        name: value,
      });
      setInstructors((prev) =>
        [...prev, { id: docRef.id, name: value }].sort((a, b) =>
          a.name.localeCompare(b.name, "hu"),
        ),
      );
      setNewInstructor("");
    } catch (error) {
      if (isPermissionDenied(error)) {
        alert("Nincs jogosultságod ehhez a művelethez.");
        return;
      }
      console.error("Hiba az oktató mentése során:", error);
      alert("Hiba történt az oktató mentésekor.");
    }
  };

  const removeInstructor = async (value: string) => {
    const instr = instructors.find((i) => i.name === value);
    if (!instr) return;

    try {
      await deleteDoc(doc(db, "instructors", instr.id));
      setInstructors((prev) => prev.filter((i) => i.id !== instr.id));
    } catch (error) {
      if (isPermissionDenied(error)) {
        alert("Nincs jogosultságod ehhez a művelethez.");
        return;
      }
      console.error("Hiba az oktató törlése során:", error);
      alert("Hiba történt az oktató törlésekor.");
    }
  };

  const addLocation = async () => {
    const value = newLocation.trim();
    if (!value) return;
    if (locations.some((l) => l.name.toLowerCase() === value.toLowerCase())) {
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "locations"), { name: value });
      setLocations((prev) =>
        [...prev, { id: docRef.id, name: value }].sort((a, b) =>
          a.name.localeCompare(b.name, "hu"),
        ),
      );
      setNewLocation("");
    } catch (error) {
      if (isPermissionDenied(error)) {
        alert("Nincs jogosultságod ehhez a művelethez.");
        return;
      }
      console.error("Hiba a helyszín mentése során:", error);
      alert("Hiba történt a helyszín mentésekor.");
    }
  };

  const removeLocation = async (value: string) => {
    const loc = locations.find((l) => l.name === value);
    if (!loc) return;

    try {
      await deleteDoc(doc(db, "locations", loc.id));
      setLocations((prev) => prev.filter((l) => l.id !== loc.id));
    } catch (error) {
      if (isPermissionDenied(error)) {
        alert("Nincs jogosultságod ehhez a művelethez.");
        return;
      }
      console.error("Hiba a helyszín törlése során:", error);
      alert("Hiba történt a helyszín törlésekor.");
    }
  };

  const instructorOptions = useMemo(
    () =>
      instructors.map((i) => i.name).sort((a, b) => a.localeCompare(b, "hu")),
    [instructors],
  );

  const locationOptions = useMemo(
    () => locations.map((l) => l.name).sort((a, b) => a.localeCompare(b, "hu")),
    [locations],
  );

  const renderCoursesPanel = () => (
    <div className="flex gap-6">
      {isAdmin && (
        <div className="flex flex-col gap-4">
          {" "}
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
      )}

      <div className="justify-center">
        <div className="flex flex-wrap mb-6">
          {categories.map((label) => (
            <button
              key={label}
              onClick={() => {
                setActiveTab(label);
                setShowForm("");
              }}
              className={`px-3 py-1.5 m-1 text-sm font-semibold rounded-md transition-all duration-200 hover:cursor-pointer hover:bg-(--fifth) ${
                activeTab === label
                  ? "bg-(--fifth) text-(--second)"
                  : "bg-white/80 text-gray-700 hover:bg-white"
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
                  ? "bg-[#6e856b] text-(--second)"
                  : "bg-[#6e856b]/60 transition-all duration-200 text-(--second) rounded-md hover:bg-[#6e856b]/80"
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
            instructorOptions={instructorOptions}
            locationOptions={locationOptions}
          />
        ) : (
          <div className="bg-white p-4 shadow rounded-md min-h-25">
            <h2 className="text-lg font-bold mb-2 text-gray-800">
              {activeTab}
            </h2>

            {activeCoursesInTab.length === 0 &&
            expiredCoursesInTab.length === 0 ? (
              <p className="text-gray-600">
                Nincs tanfolyam ebben a kategóriában.
              </p>
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
                    <h3 className="text-md font-bold text-gray-700 mb-2">
                      Lejárt kurzusok
                    </h3>
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
  );

  const renderPermissionsPanel = () => (
    <div className="bg-white p-4 shadow rounded-md">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Jogosultság</h2>
      <input
        type="text"
        value={userSearchTerm}
        onChange={(event) => setUserSearchTerm(event.target.value)}
        placeholder="Keresés név vagy email alapján"
        className="w-full md:w-96 border rounded-md p-2 mb-4"
      />

      {filteredManagedUsers.length === 0 ? (
        <p className="text-gray-600">Nincs találat.</p>
      ) : (
        <ul className="space-y-2">
          {filteredManagedUsers.map((managedUser) => {
            const isSelfAdmin =
              user?.uid === managedUser.uid && managedUser.isAdmin;
            return (
              <li
                key={managedUser.uid}
                className="border rounded-md p-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {managedUser.displayName || "Névtelen felhasználó"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {managedUser.email || managedUser.uid}
                  </p>
                </div>

                <button
                  onClick={() =>
                    toggleAdminPermission(managedUser.uid, managedUser.isAdmin)
                  }
                  disabled={isSelfAdmin}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                    isSelfAdmin
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : managedUser.isAdmin
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {isSelfAdmin
                    ? "Saját admin jog nem vehető el"
                    : managedUser.isAdmin
                      ? "Admin jog elvétele"
                      : "Admin jog adása"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderDataPanel = () => (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-white p-4 shadow rounded-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Oktatók</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newInstructor}
            onChange={(event) => setNewInstructor(event.target.value)}
            placeholder="Új oktató"
            className="flex-1 border rounded-md p-2"
          />
          <button
            onClick={addInstructor}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Hozzáadás
          </button>
        </div>
        <ul className="space-y-2">
          {instructorOptions.map((option) => (
            <li
              key={option}
              className="border rounded-md p-2 flex items-center justify-between gap-2"
            >
              <span className="text-gray-800">{option}</span>
              <button
                onClick={() => removeInstructor(option)}
                className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Törlés
              </button>
            </li>
          ))}
          {instructorOptions.length === 0 && (
            <li className="text-gray-600">Nincs rögzített oktató.</li>
          )}
        </ul>
      </div>

      <div className="bg-white p-4 shadow rounded-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Helyszínek</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newLocation}
            onChange={(event) => setNewLocation(event.target.value)}
            placeholder="Új helyszín"
            className="flex-1 border rounded-md p-2"
          />
          <button
            onClick={addLocation}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Hozzáadás
          </button>
        </div>
        <ul className="space-y-2">
          {locationOptions.map((option) => (
            <li
              key={option}
              className="border rounded-md p-2 flex items-center justify-between gap-2"
            >
              <span className="text-gray-800">{option}</span>
              <button
                onClick={() => removeLocation(option)}
                className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Törlés
              </button>
            </li>
          ))}
          {locationOptions.length === 0 && (
            <li className="text-gray-600">Nincs rögzített helyszín.</li>
          )}
        </ul>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-yellow-100 to-green-100">
        <p className="text-xl font-semibold text-gray-800">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 pl-6">
          {isAdmin &&
            (["Kurzusok", "Jogosultság", "Adatok"] as AdminSection[]).map(
              (section) => (
                <button
                  key={section}
                  onClick={() => {
                    setAdminSection(section);
                    setShowForm("");
                  }}
                  className={`px-3 py-2 rounded-md font-semibold transition-colors duration-200 ${
                    adminSection === section
                      ? "bg-(--fifth) text-(--second)"
                      : "bg-white/80 text-gray-700 hover:bg-white"
                  }`}
                >
                  {section}
                </button>
              ),
            )}
        </div>

        <div className="items-center justify-center">
          {user ? (
            <div className="flex gap-5 items-center">
              <p className="text-lg font-semibold text-(--second)">
                Üdv: {user.displayName}!
              </p>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500/40 text-(--second) rounded-lg hover:bg-red-600/40 transition-colors duration-200 shadow"
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
      </div>

      {isAdmin ? (
        <div className="p-6">
          {adminSection === "Kurzusok" && renderCoursesPanel()}
          {adminSection === "Jogosultság" && renderPermissionsPanel()}
          {adminSection === "Adatok" && renderDataPanel()}
        </div>
      ) : (
        <div className="p-6">{renderCoursesPanel()}</div>
      )}

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
          <div className="bg-(--third)/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border animate-fade-in">
            <p className="text-(--second) text-lg font-bold text-center">
              Sikeres bejelentkezés!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tabs;
