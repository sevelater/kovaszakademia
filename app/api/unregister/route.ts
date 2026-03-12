import { adminDb } from "@/app/lib/firebaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const email = searchParams.get("email");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  if (!courseId || !email) {
    return new Response("Invalid request", { status: 400 });
  }

  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const snap = await courseRef.get();
    if (!snap.exists) {
      return new Response("Course not found", { status: 404 });
    }

    const users: { uid: string; displayName: string; email?: string }[] =
      snap.data()?.registeredUsers || [];
    const filtered = users.filter((u) => u.email !== email);

    await courseRef.update({ registeredUsers: filtered });

    return Response.redirect(`${siteUrl}/?unregistered=true`);
  } catch (error) {
    console.error("Hiba a lemondás feldolgozásakor:", error);
    return new Response("Hiba a lemondás feldolgozásakor.", { status: 500 });
  }
}
