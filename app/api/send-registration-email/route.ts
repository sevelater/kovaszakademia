import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type CourseSession = {
  start?: string;
  end?: string;
};

type NormalizedSession = {
  startDate: Date;
  endDate: Date;
};

type CalendarLink = {
  calendarLink: string;
  index: number;
};

export async function POST(req: Request) {
  const body = await req.json();

  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  const modularCategory = "Moduláris képzéseink";
  const courseCategories: string[] = Array.isArray(body.courseCategories)
    ? body.courseCategories
    : [];
  const isModular = courseCategories.includes(modularCategory);

  const cancelLink = `${siteUrl}/api/unregister?courseId=${encodeURIComponent(body.courseId)}&email=${encodeURIComponent(body.userEmail)}`;
  const inviteLink = `${siteUrl}/api/calendar-invite?courseId=${body.courseId}`;

  const rawSessions: CourseSession[] = Array.isArray(body.courseSessions)
    ? (body.courseSessions as CourseSession[])
    : [];

  const normalizedSessions: NormalizedSession[] = rawSessions
    .map((session: CourseSession): NormalizedSession | null => {
      if (!session?.start) return null;

      const startDate = new Date(session.start);
      if (Number.isNaN(startDate.getTime())) return null;

      const endDate = session.end
        ? new Date(session.end)
        : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      if (Number.isNaN(endDate.getTime())) return null;

      return { startDate, endDate };
    })
    .filter((session): session is NormalizedSession => Boolean(session));

  if (normalizedSessions.length === 0 && body.courseDate) {
    const startDate = new Date(body.courseDate);
    if (!Number.isNaN(startDate.getTime())) {
      const endDate = body.courseEndDate
        ? new Date(body.courseEndDate)
        : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      if (!Number.isNaN(endDate.getTime())) {
        normalizedSessions.push({ startDate, endDate });
      }
    }
  }

  const calendarLinks: CalendarLink[] = normalizedSessions.map(
    (session: NormalizedSession, index: number) => {
      const calendarLink =
        `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(body.courseTitle)}` +
        `&dates=${formatDate(session.startDate)}/${formatDate(session.endDate)}` +
        `&details=${encodeURIComponent("Jelentkezésed visszaigazolva. Ellenőrizd az emailed.")}` +
        `&location=${encodeURIComponent(body.location || "Helyszín hamarosan")}` +
        `&sf=true&output=xml`;

      return { calendarLink, index };
    },
  );

  const sessionRowsHtml =
    normalizedSessions.length <= 1
      ? (() => {
          const session = normalizedSessions[0];
          if (!session) {
            return `<p>📅 ${body.courseDate || "Időpont egyeztetés alatt"}</p>`;
          }
          const startLabel = session.startDate.toLocaleString("hu-HU", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const endLabel = session.endDate.toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `<p>📅 ${startLabel} – ${endLabel}</p>`;
        })()
      : `<ul style="margin:8px 0 0 18px;padding:0">
          ${normalizedSessions
            .map((session, index) => {
              const startLabel = session.startDate.toLocaleString("hu-HU", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const endLabel = session.endDate.toLocaleTimeString("hu-HU", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return `<li style="margin:4px 0">Alkalom ${index + 1}: ${startLabel} – ${endLabel}</li>`;
            })
            .join("")}
        </ul>`;

  const calendarLinksHtml = isModular
    ? `<a href="${inviteLink}" style="
          display:block;
          background:#2563eb;
          color:white;
          text-align:center;
          padding:12px;
          border-radius:8px;
          text-decoration:none;
          margin-bottom:20px
        ">
          📅 Összes alkalom hozzáadása a naptárhoz
        </a>`
    : calendarLinks.length <= 1
      ? `<a href="${calendarLinks[0]?.calendarLink || "#"}" style="
          display:block;
          background:#2563eb;
          color:white;
          text-align:center;
          padding:12px;
          border-radius:8px;
          text-decoration:none;
          margin-bottom:20px
        ">
          📅 Hozzáadás Google Naptárhoz
        </a>`
      : `<div style="margin-bottom:20px">
        ${calendarLinks
          .map(
            (link: CalendarLink) => `
    <a href="${link.calendarLink}" style="
      display:block;
      background:#2563eb;
      color:white;
      text-align:center;
      padding:12px;
      border-radius:8px;
      text-decoration:none;
      margin-bottom:8px
    ">
      📅 Alkalom ${link.index + 1} hozzáadása a Google Naptárhoz
    </a>
  `,
          )
          .join("")}
      </div>`;

  const html = `
  <div style="font-family:Arial;background:#f5f5f5;padding:40px">

    <div style="
      max-width:600px;
      margin:auto;
      background:white;
      border-radius:12px;
      padding:30px;
      box-shadow:0 10px 30px rgba(0,0,0,0.1)
    ">

      <h1 style="margin-top:0">🍞 Jelentkezés visszaigazolva!</h1>

      <p>
      Kedves <b>${body.userName}</b>!
      </p>

      <p>
      Köszönjük a jelentkezésedet a következő workshopra:
      </p>

      <div style="
        background:#fafafa;
        padding:20px;
        border-radius:8px;
        margin:20px 0
      ">
        <h2 style="margin:0">${body.courseTitle}</h2>
        ${sessionRowsHtml}
        <p>📍 ${body.location || "Helyszín hamarosan"}</p>
      </div>

      <p>
      Már csak egy lépés van hátra: biztosítsd a helyed a befizetéssel.
      </p>

      <a href="${body.paymentLink}" style="
        display:block;
        background:#22c55e;
        color:white;
        text-align:center;
        padding:14px;
        border-radius:8px;
        text-decoration:none;
        font-weight:bold;
        margin:20px 0
      ">
        💳 Fizetés most
      </a>

      ${calendarLinksHtml}

      <hr/>

      ${
        isModular
          ? `<p style="font-size:14px;color:#666">
              A moduláris képzéseknél lemondásra nincs lehetőség.
            </p>`
          : `<p style="font-size:14px;color:#666">
              Ha mégsem tudsz részt venni, a jelentkezést egy kattintással lemondhatod:
            </p>

            <a href="${cancelLink}" style="
              color:#ef4444;
              font-size:14px
            ">
              Jelentkezés lemondása
            </a>`
      }

      <hr/>

      <p style="font-size:13px;color:#888">
      Várunk szeretettel!<br/>
      Péksuli csapata
      </p>

    </div>
  </div>
  `;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: [body.userEmail],
    subject: `Jelentkezés visszaigazolás – ${body.courseTitle}`,
    html,
  });

  return Response.json({ success: true });
}
