"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../../firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentCancel, setShowPaymentCancel] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const cancel = searchParams.get("cancel");

    if (success === "true") {
      setShowPaymentSuccess(true);
    }

    if (cancel === "true") {
      setShowPaymentCancel(true);
    }
  }, [searchParams]);

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
    if (authLoading || !user) {
      alert("Kérlek jelentkezz be a jelentkezéshez!");
      return;
    }
    if (!course || isExpiredCourse(course)) {
      alert("Nem lehet jelentkezni erre a kurzusra.");
      return;
    }
    if (course.registeredUsers.length >= course.maxCapacity) {
      alert("A kurzus betelt!");
      return;
    }

    if (!course?.id) {
      alert("Érvénytelen kurzus!");
      return;
    }

    const courseId = course.id;

    try {
      const courseRef = doc(db, "courses", course.id!);

      // Firestore update
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

      // fetch email és payment link csak akkor, ha minden adat rendelkezésre áll
      if (!user || !user.email || !course?.id) {
        alert("Hiba: hiányzó adatok a jelentkezéshez!");
        return;
      }

      const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${course.id}?pay=true`;

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
          paymentLink,
        }),
      });

      alert("Sikeres jelentkezés! Ellenőrizd az emailed a visszaigazolásért.");
    } catch (err) {
      console.error(err);
      alert("Hiba történt a jelentkezés során.");
    }
  };

  const handlePayment = async () => {
    if (!user || !course) return;

    setPaymentLoading(true);

    try {
      const stripe = await stripePromise;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();

      if (!data.sessionId) {
        console.error("Stripe session hiba:", data);
        alert("Nem sikerült elindítani a fizetést.");
        return;
      }

      await stripe?.redirectToCheckout({
        sessionId: data.sessionId,
      });
    } catch (error) {
      console.error("Stripe hiba:", error);
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
        className="text-(--second) font-medium h-min tracking-wider bg-(--fifth)/30 p-1.5 duration-200 ease-in-out hover:bg-(--fifth)/50"
      >
        Piactér
      </button>

      <div className="relative w-3/4 max-w-5xl">
        <div className="relative bg-(--fourth) h-1/2 rounded-md mb-4 overflow-hidden">
          {imgs.length > 0 ? (
            <>
              <img
                src={imgs[currentImg]}
                alt={`Kép ${currentImg + 1}`}
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

          <div className="flex gap-x-2">
            {!isRegistered && !isFull && !isExpired && (
              <button
                onClick={registerUser}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mb-2"
              >
                Jelentkezés
              </button>
            )}

            {isRegistered && (
              <button
                onClick={handlePayment}
                className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mb-2"
                disabled={paymentLoading}
              >
                {paymentLoading ? "Fizetés folyamatban..." : "Fizetés"}
              </button>
            )}
          </div>
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
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md text-center animate-fade-in">
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              🎉 Sikeres fizetés!
            </h2>

            <p className="text-gray-600 mb-4">
              A helyedet sikeresen lefoglaltuk a kurzusra.
            </p>

            <p className="text-gray-600 mb-6">
              A részleteket és a kurzus információkat elküldtük emailben. Kérlek
              ellenőrizd a postaládádat! 📩
            </p>

            <button
              onClick={() => {
                setShowPaymentSuccess(false);
                router.replace(`/courses/${course.id}`, { scroll: false });
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
            >
              Rendben
            </button>
          </div>
        </div>
      )}
      {showPaymentCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md text-center">
            <h2 className="text-2xl font-bold text-orange-500 mb-2">
              ⚠️ Fizetés megszakítva
            </h2>

            <p className="text-gray-600 mb-6">
              Úgy tűnik a fizetés nem lett befejezve. A helyed még nincs
              lefoglalva.
            </p>

            <p className="text-gray-600 mb-6">
              Ha szeretnél részt venni a kurzuson, bármikor újra megpróbálhatod
              a fizetést.
            </p>

            <button
              onClick={() => {
                setShowPaymentCancel(false);
                router.replace(`/courses/${course.id}`, { scroll: false });
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
            >
              Újrapróbálom
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
