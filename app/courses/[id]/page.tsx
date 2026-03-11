"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { loadStripe } from "@stripe/stripe-js";

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

const stripePromise = loadStripe(
  process.env
    .pk_test_51RpMxOCjFsFckpeAKq3NdMTv8rOCdKBA1jIpx4ca2XYQ33R0JXyi0cEpZrv0XG5p5TQIvAcLtHbbgzH7GsrvLd0700bM9V0KuJ!,
);

const isExpiredCourse = (course: Course | null): boolean => {
  if (!course?.datetime) return false;
  const courseDate = new Date(course.datetime);
  if (Number.isNaN(courseDate.getTime())) return false;
  return courseDate.getTime() < Date.now();
};

const CourseDetails: React.FC = () => {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [currentImg, setCurrentImg] = useState<number>(0);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

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
          console.error("Hiba az admin statusz lekerese soran:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        const docRef = doc(db, "courses", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const courseData: Course = {
            id: docSnap.id,
            title: data.title || "Nincs cim",
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
              courseData.registeredUsers.some((u) => u.uid === user.uid),
            );
          }
        }
      } catch (error) {
        console.error("Hiba a tanfolyam betoltese soran:", error);
      }

      setLoading(false);
    };

    fetchCourse();
  }, [id, user]);

  const registerUser = async (): Promise<boolean> => {
    if (authLoading || !user) return false;
    if (!course || isExpiredCourse(course)) {
      alert("Nem lehet jelentkezni erre a kurzusra.");
      return false;
    }
    if (course.registeredUsers.length >= course.maxCapacity) {
      alert("A kurzus betelt!");
      return false;
    }

    try {
      const courseRef = doc(db, "courses", course.id!);
      await updateDoc(courseRef, {
        registeredUsers: arrayUnion({
          uid: user.uid,
          displayName: user.displayName || "Névtelen",
          email: user.email,
        }),
      });

      setCourse((prev) =>
        prev
          ? {
              ...prev,
              registeredUsers: [
                ...prev.registeredUsers,
                {
                  uid: user.uid,
                  displayName: user.displayName || "Névtelen",
                  email: user.email,
                },
              ],
            }
          : prev,
      );
      setIsRegistered(true);

      // Email küldés + ICS + Google Calendar link
      await fetch("/api/send-registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.displayName,
          userEmail: user.email,
          courseTitle: course.title,
          courseDate: course.datetime,
          courseId: course.id,
          location: course.location,
        }),
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

const handleUnregister = async () => {
  if (!user || !user.uid) {
    alert("Érvénytelen felhasználó!");
    return;
  }

  if (!course?.id) {
    alert("Érvénytelen kurzus!");
    return;
  }

  const courseRef = doc(db, "courses", course.id); // course.id használata
  const courseSnap = await getDoc(courseRef);

  if (!courseSnap.exists()) {
    alert("A kurzus nem létezik!");
    return;
  }

  const currentUsers = courseSnap.data()?.registeredUsers || [];
  const isRegistered = currentUsers.some(
    (u: { uid: string; displayName: string }) => u.uid === user.uid
  );

  if (!isRegistered) {
    alert("Nem vagy jelentkezve erre a kurzusra!");
    return;
  }

  await updateDoc(courseRef, {
    registeredUsers: arrayRemove({
      uid: user.uid,
      displayName: user.displayName || "Névtelen",
    }),
  });

  setCourse(prev => prev ? {
    ...prev,
    registeredUsers: prev.registeredUsers.filter(u => u.uid !== user.uid)
  } : prev);

  setIsRegistered(false);
  alert("Jelentkezés sikeresen visszavonva!");
};

  const handlePayment = async () => {
    if (!user || !course) return;
    setPaymentLoading(true);
    try {
      const stripe = await stripePromise;
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, userEmail: user.email }),
      });
      const data = await res.json();
      await stripe?.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (
      paymentStatus === "success" &&
      user &&
      user.uid &&
      course &&
      course.id &&
      !isRegistered
    ) {
      registerUser();
    }
  }, [searchParams, user, course, isRegistered]);

  if (authLoading || loading) {
    return <div className="p-6 text-center">Betöltés...</div>;
  }

  if (!course) {
    return <div className="p-6 text-center">Tanfolyam nem található!</div>;
  }

  if (isExpiredCourse(course) && !isAdmin) {
    return <div className="p-6 text-center">Ez a tanfolyam már lejárt.</div>;
  }

  const imgs = course.images || [];
  const remainingSpots = course.maxCapacity - course.registeredUsers.length;
  const isFull = remainingSpots <= 0;
  const isExpired = isExpiredCourse(course);

  return (
    <div className="p-6 flex gap-6 bg-(--first) min-h-screen">
      <button
        onClick={() => router.push("/")}
        className="text-(--second) font-medium tracking-wider p-1.5 rounded-md backdrop-blur-3xl bg-(--fifth) h-min duration-200 ease-in-out hover:bg-(--fifth)/50"
      >
        Piactér
      </button>

      <div className="relative w-3/4 max-w-5xl">
        <div className="relative bg-(--fourth) h-1/2 rounded-md mb-4 overflow-hidden">
          {imgs.length > 0 ? (
            <>
              <img
                src={imgs[currentImg]}
                alt={`Kep ${currentImg + 1}`}
                className="object-cover w-full h-full"
              />
              {imgs.length > 1 && (
                <button
                  onClick={() =>
                    setCurrentImg((i) => (i - 1 + imgs.length) % imgs.length)
                  }
                  className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black/30 text-white p-1 rounded-full"
                >
                  &lt;
                </button>
              )}
              {imgs.length > 1 && (
                <button
                  onClick={() => setCurrentImg((i) => (i + 1) % imgs.length)}
                  className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black/30 text-white p-1 rounded-full"
                >
                  &gt;
                </button>
              )}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {imgs.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className={`w-2 h-2 rounded-full cursor-pointer ${idx === currentImg ? "bg-white" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-[var(--second)] flex items-center justify-center h-full">
              Ehhez a kurzushoz nincs kép.
            </p>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
        <p className="text-gray-600 mb-4">{course.lead}</p>
        <h2 className="text-lg font-semibold mb-2">Leiras</h2>
        <p className="text-gray-600 mb-4">
          {course.description || "Nincs reszletes leiras."}
        </p>
        <h2 className="text-lg font-semibold mb-2">Felszereles</h2>
        <p className="text-gray-600">
          Hozd magaddal: kenyérsüto forma, kötény, jegyzetfüzet.
        </p>
      </div>

      <div className="relative w-1/4">
        {/* ház illusztráció */}

        <img
          src="/random_house.png"
          alt="házikó"
          className="absolute bottom-0 right-0 w-100 h-auto"
        />

        {/* kép vége */}

        <div className="bg-white rounded-lg shadow-lg  p-4 top-4">
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
            className={`text-lg mb-4 ${isFull || isExpired ? "text-red-500" : "text-green-500"}`}
          >
            {isExpired
              ? "Lejárt kurzus"
              : isFull
                ? "Betelt!"
                : `Már csak ${remainingSpots} hely van!`}
          </p>

          {!isRegistered && (
            <button
              onClick={registerUser}
              className="bg-blue-500 text-white p-2 rounded-md"
            >
              Jelentkezés
            </button>
          )}
          {isRegistered && (
            <>
              <button
                onClick={handleUnregister}
                className="bg-red-500 text-white p-2 rounded-md"
              >
                Lemondás
              </button>
              <button
                onClick={handlePayment}
                className="bg-green-500 text-white p-2 rounded-md"
                disabled={paymentLoading}
              >
                Fizetés
              </button>
            </>
          )}

          {isAdmin && course.registeredUsers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Jelentkezök</h3>
              <ul className="list-disc pl-5">
                {course.registeredUsers.map((registeredUser, index) => (
                  <li key={index} className="text-gray-600">
                    {registeredUser.displayName || "Névtelen"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
