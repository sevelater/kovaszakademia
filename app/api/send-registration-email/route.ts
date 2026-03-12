import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  const body = await req.json();

  const cancelLink =
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/unregister` +
    `?courseId=${body.courseId}&email=${body.userEmail}`;

  const startDate = new Date(body.courseDate!);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 órás kurzus, módosítható---------------------------------------------

  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

  const calendarLink =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(body.courseTitle)}` +
    `&dates=${formatDate(startDate)}/${formatDate(endDate)}` +
    `&details=${encodeURIComponent("Jelentkezésed visszaigazolva. Ellenőrizd az emailed.")}` +
    `&location=${encodeURIComponent(body.location || "Helyszín hamarosan")}` +
    `&sf=true&output=xml`;

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
        <p>📅 ${body.courseDate}</p>
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

      <a href="${calendarLink}" style="
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
      </a>

      <hr/>

      <p style="font-size:14px;color:#666">
      Ha mégsem tudsz részt venni, a jelentkezést egy kattintással lemondhatod:
      </p>

      <a href="${cancelLink}" style="
        color:#ef4444;
        font-size:14px
      ">
        Jelentkezés lemondása
      </a>

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
    to: body.userEmail,
    subject: `Jelentkezés visszaigazolás – ${body.courseTitle}`,
    html,
  });

  return Response.json({ success: true });
}
