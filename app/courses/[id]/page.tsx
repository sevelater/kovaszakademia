"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
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

  const registerUser = async () => {
    if (authLoading) {
      alert("Kérlek várj, a hitelesytési állapot még betöltés alatt!");
      return false;
    }
    if (!user || !user.uid) {
      alert("Bejelentkezés szükséges a jelentkezéshez!");
      return false;
    }
    if (!course?.id) {
      alert("Érvenytelen kurzus!");
      return false;
    }
    if (isExpiredCourse(course)) {
      alert("Erre a lejárt kurzusra már nem lehet jelentkezni.");
      return false;
    }
    if (course.registeredUsers.length >= course.maxCapacity) {
      alert("A kurzus betelt!");
      return false;
    }

    try {
      const courseRef = doc(db, "courses", course.id);
      const courseSnap = await getDoc(courseRef);
      if (!courseSnap.exists()) {
        alert("A kurzus nem létezik!");
        return false;
      }

      const currentUsers = courseSnap.data().registeredUsers || [];
      if (
        currentUsers.some(
          (u: { uid: string; displayName: string }) => u.uid === user.uid,
        )
      ) {
        alert("MÁr jelentkeztel erre a kurzusra!");
        return false;
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
          : prev,
      );
      setIsRegistered(true);
      // alert("Sikeres jelentkezes!");
      return true;
    } catch (error: unknown) {
      console.error("Hiba a jelentkezés során:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ismeretlen hiba";
      alert(`Hiba történt a jelentkezés közben: ${errorMessage}`);
      return false;
    }
  };

  const handleUnregister = async () => {
    if (authLoading) {
      alert("Kérlek várj, a hitelesitesi állapot meg betöltes alatt!");
      return;
    }
    if (!user || !user.uid || !course?.id) {
      alert("Érvenytelen kurzus vagy felhasználó!");
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
            (u: { uid: string; displayName: string }) => u.uid === user.uid,
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
                  (u) => u.uid !== user.uid,
                ),
              }
            : prev,
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

  const handlePayment = async () => {
    if (!user || !user.uid || !user.email) {
      alert("Bejelentkezés szükséges, és az email cím nem lehet üres!");
      return;
    }
    if (!course || !course.id || !course.title || !course.price) {
      alert("Érvénytelen kurzus adatok!");
      return;
    }
    if (isExpiredCourse(course)) {
      alert("Lejárt kurzusra nem lehet befizetni.");
      return;
    }

    setPaymentLoading(true);
    try {
      const stripeReady = stripePromise;
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          coursePrice: course.price,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error: ${response.status} - ${text}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from API");
      }

      const data: { sessionId: string } = await response.json();
      if (!data.sessionId) {
        throw new Error("Stripe session ID missing in response");
      }

      const stripe = await stripeReady;
      if (!stripe) {
        throw new Error("Stripe initialization failed");
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });
      if (error) {
        throw new Error(`Stripe checkout error: ${error.message}`);
      }
    } catch (error: unknown) {
      console.error("Hiba a fizetesi folyamat soran:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ismeretlen hiba";
      alert(`Hiba tortent a fizetes kozben: ${errorMessage}`);
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

          {!isExpired && !isFull && !isRegistered && (
            <button
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mb-2 disabled:opacity-50"
              onClick={registerUser}
              disabled={authLoading || !user}
            >
              Jelentkezés
            </button>
          )}

          {!isExpired && isRegistered && (
            <>
              <button
                className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 mb-2 disabled:opacity-50"
                onClick={handleUnregister}
                disabled={authLoading}
              >
                Jelentkezés visszavonása
              </button>
              <button
                className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mb-2 disabled:opacity-50"
                onClick={handlePayment}
                disabled={paymentLoading || !user}
              >
                {paymentLoading ? "Fizetes folyamatban..." : "Fizetes"}
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
