import { adminDb } from "@/app/lib/firebaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const email = searchParams.get("email");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kovaszakademia.vercel.app").replace(/\/$/, "");

  if (!courseId || !email) {
    return new Response("Invalid request", { status: 400 });
  }

  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const snap = await courseRef.get();

    if (!snap.exists) {
      return new Response("Course not found", { status: 404 });
    }

    const data = snap.data();
    const users: { uid: string; displayName: string; email?: string }[] =
      data?.registeredUsers && Array.isArray(data.registeredUsers)
        ? data.registeredUsers
        : [];

    const filtered = users.filter((u) => u.email !== email);

    await courseRef.update({ registeredUsers: filtered });

    // HTML alapú redirect
    return new Response(
      `
      <html>
        <head>
          <meta http-equiv="refresh" content="2;url=${siteUrl}/?unregistered=true" />
        </head>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h1>Lemondás feldolgozva ✅</h1>
          <p>Ha nem történik átirányítás automatikusan, <a href="${siteUrl}/?unregistered=true">kattints ide</a></p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Hiba a lemondás feldolgozásakor:", error);
    return new Response("Hiba a lemondás feldolgozásakor.", { status: 500 });
  }
}