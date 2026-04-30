import { useState } from "react";
import toast from "react-hot-toast";

export default function PaymentMethodModal({
  isOpen,
  onClose,
  course,
  token,
  onPaymentSuccess,
}) {
  const [processingMethod, setProcessingMethod] = useState(null); // null, "stripe", or "razorpay"

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  // ✅ Handle Stripe Payment
  const handleStripePayment = async () => {
    setProcessingMethod("stripe");
    try {
      const res = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course: {
            id: course.id,
            title: course.title,
            priceValue: course.priceValue,
          },
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Stripe session failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Stripe payment failed");
      setProcessingMethod(null);
    }
  };

  // ✅ Handle Razorpay Payment
  const handleRazorpayPayment = async () => {
    setProcessingMethod("razorpay");
    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch(
        `${API_BASE_URL}/api/payment/create-razorpay-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course: {
              id: course.id,
              title: course.title,
              priceValue: course.priceValue,
            },
          }),
        }
      );

      const orderData = await orderRes.json();
      if (!orderData.orderId) {
        throw new Error("Failed to create Razorpay order");
      }

      // Step 2: Load Razorpay script and open checkout
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          handler: async (response) => {
            // Step 3: Verify payment
            const verifyRes = await fetch(
              `${API_BASE_URL}/api/payment/verify-razorpay-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  courseId: course.id,
                }),
              }
            );

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success("Payment successful!");
              onPaymentSuccess(course.id);
              onClose();
            } else {
              toast.error("Payment verification failed");
            }
            setProcessingMethod(null);
          },
          prefill: {
            name: "User Name",
            email: "user@example.com",
          },
          theme: {
            color: "#16B896",
          },
        };

        const razorpayCheckout = new window.Razorpay(options);
        razorpayCheckout.open();
      };

      document.body.appendChild(script);
    } catch (err) {
      console.error(err);
      toast.error("Razorpay payment failed");
      setProcessingMethod(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Choose Payment Method</h2>

        <div className="space-y-4">
          {/* Stripe Option */}
          <button
            onClick={handleStripePayment}
            disabled={processingMethod !== null}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
              processingMethod === "stripe"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-blue-50"
            }`}
          >
            {processingMethod === "stripe" ? "Processing..." : "💳 Pay with Stripe"}
          </button>

          {/* Razorpay Option */}
          <button
            onClick={handleRazorpayPayment}
            disabled={processingMethod !== null}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
              processingMethod === "razorpay"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-blue-50"
            }`}
          >
            {processingMethod === "razorpay" ? "Processing..." : "💳 Pay with Razorpay"}
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={processingMethod !== null}
          className="w-full mt-4 py-2 px-4 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
