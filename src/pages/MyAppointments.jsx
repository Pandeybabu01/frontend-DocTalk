import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("_");
    return `${dateArray[0]} ${months[Number(dateArray[1])]} ${dateArray[2]}`;
  };

  const getUserAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setAppointments(data.appointments.reverse());
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch appointments."
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const decoded = jwtDecode(token);
      const userId = decoded._id || decoded.id;

      if (!appointmentId || !userId) {
        toast.error("appointmentId and userId are required.");
        return;
      }

      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId, userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
        getDoctorsData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("API Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "An error occurred.");
    }
  };

  // Razorpay payment initialization
  const initPay = (order) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Ensure VITE is used only in Vite projects
      amount: order.amount,
      currency: order.currency,
      name: "Appointment Payment",
      description: "Doctor appointment payment",
      order_id: order.id,
      receipt: order.receipt,
      handler: async (response) => {
        console.log(response);
        try {
          const { data } = await axios.post(
            `${backendUrl}/api/user/verifyRazorpay`,
            response,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (data.success) {
            toast.success("Payment successful");
            getUserAppointments();
            navigate("/my-appointments");
          } else {
            toast.error(data.message || "Payment verification failed");
          }
        } catch (error) {
          console.error("Payment verification failed:", error);
          toast.error(
            error.response?.data?.message || "Payment verification failed"
          );
        }
      },
      theme: {
        color: "#0f172a",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const appointmentRazorpay = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/payment-razorpay`,
        { appointmentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        initPay(data.order);
      } else {
        toast.error(data.message || "Payment initiation failed");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast.error(error.response?.data?.message || "Error initiating payment");
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  return (
    <div>
      <p className="pb-3 mt-12 font-medium text-zinc-700 border-b">
        My appointments
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No appointments found.</p>
      ) : (
        <div>
          {appointments.map((item) => (
            <div
              className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b"
              key={item._id}
            >
              <div>
                <img
                  className="w-32 bg-indigo-50"
                  src={item.docData?.image}
                  alt="Doctor"
                />
              </div>

              <div className="flex-1 text-sm text-zinc-600">
                <p className="text-neutral-700 font-semibold">
                  {item.docData?.name}
                </p>
                <p>{item.docData?.speciality}</p>
                <p className="text-zinc-700 font-medium mt-1">Address:</p>
                <p className="text-xs">{item.docData?.address?.line1}</p>
                <p className="text-xs">{item.docData?.address?.line2}</p>
                <p className="text-xm mt-1">
                  <span className="text-sm text-neutral-700 font-medium">
                    Date & Time:
                  </span>{" "}
                  {slotDateFormat(item.slotDate)} | {item.slotTime}
                </p>
              </div>

              {/* <div className="flex flex-col gap-2 justify-end">
                {!item.cancelled && !item.payment && !item.isCompleted && (
                  <button className="sm:min-w-48 py-2 border rounded text-stone-500 bg-indigo-50">
                    Paid
                  </button>
                )}

                {!item.cancelled && !item.payment &&  (
                  <>
                    <button
                      onClick={() => appointmentRazorpay(item._id)}
                      className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300"
                    >
                      Pay Online
                    </button>
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300"
                    >
                      Cancel appointment
                    </button>
                  </>
                )}

                {item.cancelled && (
                  <button
                    disabled
                    className="text-sm sm:min-w-48 py-2 border border-red-500 rounded text-red-500 bg-red-50 cursor-not-allowed"
                  >
                    Appointment Cancelled
                  </button>
                )}
              </div> */}

              
              <div className="flex flex-col gap-2 justify-end">
  {/* Case: Not paid, not cancelled, not completed → Show Pay + Cancel */}
  {!item.payment && !item.cancelled && !item.isCompleted && (
    <>
      <button
        onClick={() => appointmentRazorpay(item._id)}
        className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300"
      >
        Pay Online
      </button>

      <button
        onClick={() => cancelAppointment(item._id)}
        className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300"
      >
        Cancel appointment
      </button>
    </>
  )}

  {/* Case: Paid, not cancelled, not completed → Show Paid */}
  {item.payment && !item.cancelled && !item.isCompleted && (
    <button
      className="sm:min-w-48 py-2 border rounded text-stone-500 bg-indigo-50"
    >
      Paid
    </button>
  )}

  {/* Case: Cancelled → Show only Cancelled label (hide Completed) */}
  {item.cancelled && (
    <button
      disabled
      className="text-sm sm:min-w-48 py-2 border border-red-500 rounded text-red-500 bg-red-50 cursor-not-allowed"
    >
      Appointment Cancelled
    </button>
  )}

  {/* Case: Completed but NOT Cancelled → Show Completed label */}
  {!item.cancelled && item.isCompleted && (
    <button
      disabled
      className="text-sm sm:min-w-48 py-2 border border-green-600 rounded text-green-600 bg-green-50 cursor-not-allowed"
    >
      Appointment Completed
    </button>
  )}
</div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
