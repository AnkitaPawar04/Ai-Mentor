import React, { useState, useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import axios from "axios";
import { changePasswordSchema } from "../schemas/adminAuthSchema";

const SettingsPage = () => {
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Check if they are the Super Admin
  const isSuperAdmin = user?.role === "superadmin";

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setServerMessage({ type: "", text: "" });

    const validationResult = changePasswordSchema.safeParse(formData);

    if (!validationResult.success) {
      const formattedErrors = {};
      validationResult.error.issues.forEach((issue) => {
        formattedErrors[issue.path[0]] = issue.message;
      });
      setErrors(formattedErrors);
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token"); 

      const response = await axios.put(
        "http://localhost:5000/api/admin/change-password", 
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        }
      );


      setServerMessage({ type: "success", text: response.data.message });
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({});

    } catch (error) {
      setServerMessage({
        type: "error",
        text: error.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-main mb-6">Settings</h1>
      
      <div className="bg-card border border-border/50 rounded-2xl p-6 max-w-xl shadow-sm">
        <h2 className="text-xl font-bold text-main mb-1">Change Password</h2>
        <p className="text-sm text-muted mb-6">
          Update your admin account password.
        </p>

        {isSuperAdmin ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-xl bg-canvas/50 text-center">
            <ShieldAlert className="w-12 h-12 text-orange-500 mb-3 opacity-80" />
            <h3 className="text-lg font-bold text-main">Action Restricted</h3>
            <p className="text-sm text-muted mt-2 max-w-sm">
              Super Admin passwords cannot be changed from this dashboard. Please contact the system architect to update root credentials.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Server Message Banner */}
            {serverMessage.text && (
              <div className={`p-4 rounded-xl text-sm font-bold ${
                serverMessage.type === "success" 
                ? "bg-teal-50 text-teal-600 border border-teal-200" 
                : "bg-red-50 text-red-600 border border-red-200"
              }`}>
                {serverMessage.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-main mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                className={`w-full px-4 py-2.5 bg-canvas border rounded-xl text-sm focus:ring-2 transition-all outline-none ${
                  errors.currentPassword ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-teal-500/20 focus:border-teal-500"
                }`}
              />
              {errors.currentPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.currentPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-main mb-1.5">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                className={`w-full px-4 py-2.5 bg-canvas border rounded-xl text-sm focus:ring-2 transition-all outline-none ${
                  errors.newPassword ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-teal-500/20 focus:border-teal-500"
                }`}
              />
              {errors.newPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.newPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-main mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                className={`w-full px-4 py-2.5 bg-canvas border rounded-xl text-sm focus:ring-2 transition-all outline-none ${
                  errors.confirmPassword ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-teal-500/20 focus:border-teal-500"
                }`}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;