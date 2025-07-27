import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key is missing");
    }

    const isLocalhost = process.env.NODE_ENV === "development";
    const baseUrl = isLocalhost
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || "https://your-vercel-app.vercel.app";

    if (!baseUrl) {
      throw new Error("Base URL is missing");
    }

    const { courseId, courseTitle, coursePrice, userId, userEmail } = await request.json();

    if (!courseId || !courseTitle || !coursePrice || !userId || !userEmail) {
      throw new Error("Missing required fields");
    }

    console.log("Creating Stripe checkout session with:", { courseId, courseTitle, coursePrice, userId, userEmail, baseUrl });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: courseTitle,
              metadata: { courseId },
            },
            unit_amount: coursePrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/courses/${courseId}?payment=success`,
      cancel_url: `${baseUrl}/courses/${courseId}?payment=canceled`,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: { courseId, userId },
    });

    console.log("Checkout session created:", session.id);

    return NextResponse.json({ sessionId: session.id }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}