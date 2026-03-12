import { adminDb } from "@/app/lib/firebaseAdmin";

type RegisteredUser = {
  uid: string;
  displayName: string;
  email?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const email = searchParams.get("email");
  const siteUrl =
    (process.env.NEXT_PUBLIC_SITE_URL || "https://kovaszakademia.vercel.app").replace(
      /\/$/,
      ""
    );

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
    const users: RegisteredUser[] =
      data?.registeredUsers && Array.isArray(data.registeredUsers)
        ? data.registeredUsers
        : [];

    const filtered = users.filter((u: RegisteredUser) => u.email !== email);

    await courseRef.update({ registeredUsers: filtered });

    // HTML redirect a frontend oldalra, ahol JSX renderel
    return new Response(
      `<html>
        <head>
          <meta http-equiv="refresh" content="0;url=${siteUrl}/courses/${courseId}?unregistered=true">
        </head>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h1>Lemondás feldolgozva ✅</h1>
          <p>Ha nem történik átirányítás automatikusan, <a href="${siteUrl}/courses/${courseId}?unregistered=true">kattints ide</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Hiba a lemondás feldolgozásakor:", err);
    return new Response("Hiba történt.", { status: 500 });
  }
}