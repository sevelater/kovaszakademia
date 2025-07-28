"use client";

import React, { useState } from "react";
import { db, storage } from "../../firebase";
import { addDoc, collection, setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 } from "uuid";

const categories = [
  "Pékeknek és pékségeknek",
  "Otthon sütőknek",
  "Moduláris képzésünk",
  "Mesterkurzusok",
  "Üzleti tanácsadás pékségeknek",
  "Oktatói franchise",
];

type Course = {
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
};

type Props = {
  mode: "create" | "edit";
  course?: Course;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setShowForm: (form: string) => void;
  isAdmin: boolean;
};

export default function CourseForm({
  mode,
  course,
  setCourses,
  setShowForm,
  isAdmin,
}: Props) {
  const years = Array.from({ length: 6 }, (_, i) => 2025 + i);
  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const days = Array.from({ length: 31 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  const minutes = ["00", "15", "30", "45"];

  const [form, setForm] = useState({
    title: course?.title || "",
    price: course?.price.toString() || "",
    instructor: course?.instructor || "",
    location: course?.location || "",
    lead: course?.lead || "",
    description: course?.description || "",
    categories: course?.categories || [],
    datetime: course?.datetime || "",
    year: course?.datetime ? course.datetime.split("T")[0].split("-")[0] : "",
    month: course?.datetime ? course.datetime.split("T")[0].split("-")[1] : "",
    day: course?.datetime ? course.datetime.split("T")[0].split("-")[2] : "",
    hour: course?.datetime ? course.datetime.split("T")[1].split(":")[0] : "",
    minute: course?.datetime ? course.datetime.split("T")[1].split(":")[1] : "",
    maxCapacity: course?.maxCapacity?.toString() || "",
  });


  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>("");

  const handleCategoryToggle = (category: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updatedForm = { ...prev, [name]: value };
      if (["year", "month", "day", "hour", "minute"].includes(name)) {
        const { year, month, day, hour, minute } = updatedForm;
        if (year && month && day && hour && minute) {
          updatedForm.datetime = `${year}-${month}-${day}T${hour}:${minute}`;
        } else {
          updatedForm.datetime = "";
        }
      }
      return updatedForm;
    });
  };

  const handleImageSelection = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<File | undefined>>,
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    setImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setPreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Nincs jogosultságod tanfolyamot menteni!");
      return;
    }
    const maxCapacity = parseInt(form.maxCapacity);
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      alert("A maximális létszám legalább 1 kell legyen!");
      return;
    }

    setLoading(true);
    setProgress("Képek feltöltése és tanfolyam mentése...");

    try {
      const startTime = performance.now();
      const courseId = mode === "create" ? v4() : course!.id!;

      const courseData = {
        title: form.title,
        price: parseInt(form.price),
        instructor: form.instructor,
        location: form.location,
        lead: form.lead,
        description: form.description,
        categories: form.categories,
        datetime: form.datetime,
        maxCapacity,
        registeredUsers: course?.registeredUsers || [],
      };

      if (courseData.datetime && !isNaN(new Date(courseData.datetime).getTime())) {
        console.log("Starting Firestore write...");
        const firestoreTimeout = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Firestore write timed out after 10 seconds")),
            10000
          )
        );

        if (mode === "create") {
          const docRef = await Promise.race([
            addDoc(collection(db, "courses"), courseData),
            firestoreTimeout,
          ]);
          setCourses((prev) =>
            [...prev, { ...courseData, id: docRef.id }].sort((a, b) => {
              if (!a.datetime || !b.datetime) return 0;
              return (
                new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
              );
            })
          );
        } else {
          await Promise.race([
            setDoc(doc(db, "courses", course!.id!), courseData),
            firestoreTimeout,
          ]);
          setCourses((prev) =>
            prev
              .map((c) =>
                c.id === course!.id ? { ...courseData, id: course!.id } : c
              )
              .sort((a, b) => {
                if (!a.datetime || !b.datetime) return 0;
                return (
                  new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
                );
              })
          );
        }
        const duration = (performance.now() - startTime) / 1000;
        console.log(`Firestore write completed in ${duration} seconds`);
        console.log(`Total submit time: ${duration} seconds`);
        setShowForm("");
        alert(
          `Tanfolyam sikeresen ${mode === "create" ? "létrehozva" : "szerkesztve"}!`
        );
      } else {
        alert("Érvénytelen időpont formátum! Kérlek, adj meg érvényes időpontot.");
      }
    } catch (error: unknown) {
      console.error("Hiba a tanfolyam mentése során:", error);
      const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba";
      alert(`Hiba történt: ${errorMessage}`);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-md shadow space-y-4 max-w-5xl"
    >
      <h2 className="text-xl font-bold">
        {mode === "create" ? "Új tanfolyam létrehozása" : "Tanfolyam szerkesztése"}
      </h2>
      {progress && <div className="text-center text-gray-600">{progress}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="title"
          placeholder="Tanfolyam címe"
          value={form.title}
          onChange={handleFormChange}
          required
          className="p-2 border rounded-md"
        />
        <input
          type="number"
          name="price"
          placeholder="Ár (Ft) /fő"
          value={form.price}
          onChange={handleFormChange}
          required
          className="p-2 border rounded-md"
        />
        <input
          type="number"
          name="maxCapacity"
          placeholder="Maximális létszám"
          value={form.maxCapacity}
          onChange={handleFormChange}
          required
          min="1"
          className="p-2 border rounded-md"
        />
        <input
          type="text"
          name="instructor"
          placeholder="Oktató neve"
          value={form.instructor}
          onChange={handleFormChange}
          className="p-2 border rounded-md"
        />
        <input
          type="text"
          name="location"
          placeholder="Helyszín"
          value={form.location}
          onChange={handleFormChange}
          className="p-2 border rounded-md"
        />
        <div className="col-span-2">
          <label className="font-semibold block mb-1">Időpont</label>
          <div className="flex gap-2">
            <select
              name="year"
              value={form.year}
              onChange={handleFormChange}
              className="p-2 border rounded-md"
              required
            >
              <option value="">Év</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              name="month"
              value={form.month}
              onChange={handleFormChange}
              className="p-2 border rounded-md"
              required
            >
              <option value="">Hónap</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <select
              name="day"
              value={form.day}
              onChange={handleFormChange}
              className="p-2 border rounded-md"
              required
            >
              <option value="">Nap</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              name="hour"
              value={form.hour}
              onChange={handleFormChange}
              className="p-2 border rounded-md"
              required
            >
              <option value="">Óra</option>
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              name="minute"
              value={form.minute}
              onChange={handleFormChange}
              className="p-2 border rounded-md"
              required
            >
              <option value="">Perc</option>
              {minutes.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div>
        <label className="font-semibold block mb-1">Kategóriák</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              className={`px-3 py-1 rounded-md border cursor-pointer ${
                form.categories.includes(cat)
                  ? "bg-[var(--first)] hover:bg-[var(--first)] transition-all duration-200 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <textarea
        name="lead"
        value={form.lead}
        onChange={handleFormChange}
        rows={2}
        placeholder="Tanfolyam rövid leírása, bevezető szöveg."
        className="w-full border p-2 rounded-md"
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleFormChange}
        rows={5}
        placeholder="Részletes leírás"
        className="w-full border p-2 rounded-md"
      />
      <div className="text-right">
        <button
          type="submit"
          className="bg-[var(--first)] transition-all duration-200 text-[var(--second)] px-6 py-2 rounded-md hover:bg-[var(--first)]/80 hover:cursor-pointer"
          disabled={loading}
        >
          {loading ? "Mentés folyamatban..." : "Mentés"}
        </button>
        <button
          type="button"
          onClick={() => setShowForm("")}
          className="ml-2 px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          disabled={loading}
        >
          Mégse
        </button>
      </div>
    </form>
  );
}