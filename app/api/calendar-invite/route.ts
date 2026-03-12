import { adminDb } from "@/app/lib/firebaseAdmin";

const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");

const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");

const getCourseSessions = (data: {
  datetime?: string;
  endDatetime?: string;
  sessions?: { start: string; end: string }[];
}) => {
  if (data.sessions && data.sessions.length > 0) {
    return data.sessions
      .filter((session) => session.start)
      .map((session) => ({
        start: new Date(session.start),
        end: new Date(session.end),
      }))
      .filter(
        (session) =>
          !Number.isNaN(session.start.getTime()) &&
          !Number.isNaN(session.end.getTime()),
      );
  }

  if (!data.datetime) return [];
  const start = new Date(data.datetime);
  if (Number.isNaN(start.getTime())) return [];
  const end = data.endDatetime
    ? new Date(data.endDatetime)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (Number.isNaN(end.getTime())) return [];
  return [{ start, end }];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return new Response("Hiányzó courseId.", { status: 400 });
  }

  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const snap = await courseRef.get();
    if (!snap.exists) {
      return new Response("Kurzus nem található.", { status: 404 });
    }

    const data = snap.data() as {
      title?: string;
      location?: string;
      datetime?: string;
      endDatetime?: string;
      sessions?: { start: string; end: string }[];
    };

    const sessions = getCourseSessions(data);
    if (sessions.length === 0) {
      return new Response("Nincs érvényes időpont a kurzushoz.", { status: 400 });
    }

    const now = formatDate(new Date());
    const summary = escapeText(data.title || "Kovász Akadémia tanfolyam");
    const location = escapeText(data.location || "Helyszín hamarosan");

    const events = sessions
      .map((session, index) => {
        const uid = `${courseId}-${index + 1}@kovaszakademia`;
        return [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${now}`,
          `DTSTART:${formatDate(session.start)}`,
          `DTEND:${formatDate(session.end)}`,
          `SUMMARY:${summary}`,
          `LOCATION:${location}`,
          "END:VEVENT",
        ].join("\r\n");
      })
      .join("\r\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kovász Akadémia//HU",
      "CALSCALE:GREGORIAN",
      events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="kovaszakademia-${courseId}.ics"`,
      },
    });
  } catch (error) {
    console.error("Hiba a naptár meghívó generálásakor:", error);
    return new Response("Hiba a naptár meghívó generálásakor.", {
      status: 500,
    });
  }
}
