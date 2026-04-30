import express from "express";
import Stripe from "stripe";
import crypto from "crypto";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Initialize Stripe safely
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Razorpay credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// ✅ CREATE CHECKOUT SESSION
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { course } = req.body;

    console.log("Incoming course:", course);

    // ✅ Validate course data
    if (
      !course ||
      !course.id ||
      !course.title ||
      !course.priceValue ||
      Number(course.priceValue) <= 0
    ) {
      return res.status(400).json({
        error: "Invalid course data",
      });
    }

    // ✅ Convert price safely (₹ → paise)
    const amount = Math.round(Number(course.priceValue) * 100);

    // ✅ Build success URL
    const successUrl = `${process.env.FRONTEND_URL}/success?courseId=${course.id}&title=${encodeURIComponent(course.title)}`;

    console.log("✅ SUCCESS URL:", successUrl); // 🔥 DEBUG

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.title,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],

      // ✅ pass metadata (VERY IMPORTANT for future webhook)
      metadata: {
        courseId: course.id.toString(),
        courseTitle: course.title,
      },

      success_url: successUrl,

      cancel_url: `${process.env.FRONTEND_URL}/courses`,
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("❌ Stripe Error:", error.message);

    return res.status(500).json({
      error: "Stripe session failed",
    });
  }
});

// ✅ CREATE RAZORPAY ORDER
router.post("/create-razorpay-order", protect, async (req, res) => {
  try {
    const { course } = req.body;

    if (
      !course ||
      !course.id ||
      !course.title ||
      !course.priceValue ||
      Number(course.priceValue) <= 0
    ) {
      return res.status(400).json({
        error: "Invalid course data",
      });
    }

    // Convert price to paise (Razorpay uses smallest currency unit)
    const amount = Math.round(Number(course.priceValue) * 100);

    // Create order using Razorpay API
    const options = {
      amount: amount,
      currency: "INR",
      receipt: `receipt_${course.id}_${Date.now()}`,
      notes: {
        courseId: course.id,
        courseTitle: course.title,
      },
    };

    // Use fetch to call Razorpay API
    const auth = Buffer.from(
      `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!orderRes.ok) {
      const errorData = await orderRes.json();
      console.error("❌ Razorpay Order Error:", errorData);
      return res.status(400).json({
        error: "Failed to create Razorpay order",
        details: errorData,
      });
    }

    const orderData = await orderRes.json();

    return res.status(200).json({
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("❌ Razorpay Order Creation Error:", error.message);
    return res.status(500).json({
      error: "Failed to create Razorpay order",
    });
  }
});

// ✅ VERIFY RAZORPAY PAYMENT
router.post("/verify-razorpay-payment", protect, async (req, res) => {
  try {
    const { orderId, paymentId, signature, courseId } = req.body;
    const userId = req.user?.id;

    if (!orderId || !paymentId || !signature || !courseId || !userId) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (generated_signature !== signature) {
      console.error("❌ Payment signature mismatch");
      return res.status(400).json({
        error: "Payment verification failed",
        success: false,
      });
    }

    // ✅ Signature valid - Update user's purchased courses
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      const purchasedCourses = user.purchasedCourses || [];
      const alreadyPurchased = purchasedCourses.some(
        (c) => Number(c.courseId) === Number(courseId)
      );

      if (!alreadyPurchased) {
        purchasedCourses.push({
          courseId: Number(courseId),
          purchasedAt: new Date(),
          paymentId: paymentId,
          paymentMethod: "razorpay",
        });

        user.purchasedCourses = purchasedCourses;
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } catch (dbError) {
      console.error("❌ Database Error:", dbError.message);
      return res.status(500).json({
        error: "Failed to save purchase",
      });
    }
  } catch (error) {
    console.error("❌ Payment Verification Error:", error.message);
    return res.status(500).json({
      error: "Payment verification failed",
    });
  }
});

export default router;