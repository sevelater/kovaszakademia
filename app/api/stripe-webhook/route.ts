import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const courseId = session.metadata?.courseId;
    const userId = session.metadata?.userId;
    const userEmail = session.customer_email;

    const courseRef = doc(db, "courses", courseId!);

    if (!courseId || !userId || !userEmail) {
      console.error("Hiányzó adat a webhookban!", session.metadata);
      return NextResponse.json({ error: "Hiányzó adat" }, { status: 400 });
    }

    await updateDoc(courseRef, {
      registeredUsers: arrayUnion({
        uid: userId,
        email: session.customer_email,
      }),
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: userEmail,
      subject: "Sikeres jelentkezés",
      html: `<h2>Sikeresen jelentkeztél a kurzusra!</h2>`,
    });
  }

  return NextResponse.json({ received: true });
}
