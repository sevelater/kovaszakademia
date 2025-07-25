"use client";

import React, { useState } from "react";

// Kategóriák definiálása
const categories = [
  "Pékeknek és pékségeknek",
  "Otthon sütőknek",
  "Moduláris képzésünk",
  "Mesterkurzusok",
  "Üzleti tanácsadás pékségeknek",
  "Oktatói franchise",
];

type Course = {
  title: string;
  price: string;
  instructor: string;
  location: string;
  lead: string;
  description: string;
  categories: string[];
};

export const Tabs = () => {
  const [activeTab, setActiveTab] = useState("Rendelések");
  const [showForm, setShowForm] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  const [form, setForm] = useState<Course>({
    title: "",
    price: "",
    instructor: "",
    location: "",
    lead: "",
    description: "",
    categories: [],
  });

  const handleCategoryToggle = (category: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCourses([...courses, form]);
    setForm({
      title: "",
      price: "",
      instructor: "",
      location: "",
      lead: "",
      description: "",
      categories: [],
    });
    setShowForm(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Tab gombok */}
      <div className="flex flex-wrap mb-6">
        {["Rendelések", ...categories].map((label) => (
          <button
            key={label}
            onClick={() => {
              setActiveTab(label);
              setShowForm(false); // ha másik tabra lépünk, zárjuk a formot
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
        <button
          onClick={() => {
            setShowForm(true);
            setActiveTab("Új tanfolyam");
          }}
          className={`px-3 py-1.5 m-1 text-sm font-semibold rounded-md transition-all duration-200 hover:cursor-pointer ${
            showForm
              ? "bg-green-600 text-white"
              : "bg-green-500/40 text-black hover:bg-green-500/70"
          }`}
        >
          + Új tanfolyam
        </button>
      </div>

      {/* Tartalom */}
      {!showForm ? (
        <div className="bg-white p-4 shadow rounded-md min-h-[100px]">
          <h2 className="text-xl font-bold mb-2">{activeTab}</h2>
          {courses.filter((course) => course.categories.includes(activeTab))
            .length === 0 ? (
            <p>Nincs tanfolyam ebben a kategóriában.</p>
          ) : (
            <ul className="space-y-2">
              {courses
                .filter((course) => course.categories.includes(activeTab))
                .map((course, index) => (
                  <li key={index} className="border p-3 rounded-md bg-gray-50">
                    <h3 className="text-lg font-semibold">{course.title}</h3>
                    <p className="text-sm text-gray-600">
                      Ár: {course.price} Ft | Oktató: {course.instructor}
                    </p>
                    <p className="text-sm mt-1">{course.lead}</p>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : (
        // Űrlap
        <form
          onSubmit={handleFormSubmit}
          className="bg-white p-6 rounded-md shadow space-y-4"
        >
          <h2 className="text-xl font-bold">Új tanfolyam létrehozása</h2>
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
              type="text"
              name="instructor"
              placeholder="Oktató neve"
              value={form.instructor}
              onChange={handleFormChange}
              required
              className="p-2 border rounded-md"
            />
            <input
              type="text"
              name="location"
              placeholder="Helyszín"
              value={form.location}
              onChange={handleFormChange}
              required
              className="p-2 border rounded-md"
            />
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
            placeholder="Tanfolyam rövid leírása, bevezető szöveg. Ez fog megjelenni a listázásnál, valamint a tanfolyam adatlapján felül, kiemelten"
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
            >
              Mentés
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Tabs;