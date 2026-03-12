import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const body = await req.json(); // <-- itt parse-oljuk a json-t
    const { courseId, userEmail } = body;

    // Lekérdezzük a kurzust a Firestore-ból
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    const courseData = courseSnap.data();

    if (!courseSnap.exists() || !courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (courseData.registeredUsers.length >= courseData.maxCapacity) {
      return NextResponse.json({ error: "Course full" }, { status: 400 });
    }

    // Stripe checkout session létrehozása
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: { name: courseData.title },
            unit_amount: courseData.price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { courseId },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${courseId}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${courseId}?cancel=true`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}