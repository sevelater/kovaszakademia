import { adminDb } from "@/app/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const email = searchParams.get("email");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  if (!courseId || !email) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const snap = await courseRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const data = snap.data();
    const users: { uid: string; displayName: string; email?: string }[] =
      data?.registeredUsers && Array.isArray(data.registeredUsers)
        ? data.registeredUsers
        : [];

    const filtered = users.filter((u) => u.email !== email);

    await courseRef.update({ registeredUsers: filtered });

    return NextResponse.redirect(`${siteUrl}/?unregistered=true`);
  } catch (error) {
    console.error("Hiba a lemondás feldolgozásakor:", error);
    return NextResponse.json(
      { error: "Hiba a lemondás feldolgozásakor." },
      { status: 500 }
    );
  }
}