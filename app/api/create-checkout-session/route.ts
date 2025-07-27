import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Log environment variable availability at module level
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not defined at module initialization");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key is missing");
    }

    // Dynamically determine base URL
    const isLocalhost = process.env.NODE_ENV === "development";
    let baseUrl = isLocalhost
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;

    // Ensure baseUrl has a protocol
    if (baseUrl && !baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }
    // Fallback to a known valid URL if undefined
    baseUrl = baseUrl || "https://your-vercel-app.vercel.app"; // Replace with your actual Vercel URL

    console.log("Resolved baseUrl:", baseUrl);

    if (!baseUrl) {
      throw new Error("Base URL is missing");
    }

    // Validate baseUrl format
    try {
      new URL(baseUrl);
    } catch (error) {
      throw new Error("Invalid baseUrl format: An explicit scheme (such as https) must be provided");
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
      success_url: `${baseUrl}/courses/tree/${courseId}?payment=success`,
      cancel_url: `${baseUrl}/courses/tree/${courseId}?payment=canceled`,
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