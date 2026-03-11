import { db } from "@/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const email = searchParams.get("email");

  if (!courseId || !email) {
    return new Response("Invalid request", { status: 400 });
  }

  const courseRef = doc(db, "courses", courseId);
  const snap = await getDoc(courseRef);
  if (!snap.exists()) {
    return new Response("Course not found", { status: 404 });
  }

  const users: { uid: string; displayName: string; email?: string }[] = snap.data().registeredUsers || [];
  const filtered = users.filter((u) => u.email !== email);

  await updateDoc(courseRef, { registeredUsers: filtered });

  return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?unregistered=true`);
}