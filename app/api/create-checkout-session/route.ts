import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(request: NextRequest) {
  try {
    // Check for missing environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key is missing");
    }
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      throw new Error("Base URL is missing");
    }

    const { courseId, courseTitle, coursePrice, userId, userEmail } = await request.json();

    // Validate input
    if (!courseId || !courseTitle || !coursePrice || !userId || !userEmail) {
      throw new Error("Missing required fields");
    }

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
            unit_amount: coursePrice * 100, // Stripe expects amount in smallest currency unit (e.g., HUF in fillér)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${courseId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${courseId}?payment=canceled`,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: { courseId, userId },
    });

    return NextResponse.json({ sessionId: session.id }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}