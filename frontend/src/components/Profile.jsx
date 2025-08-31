import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateEmail,
    updatePassword,
    updateProfile,
} from "firebase/auth"
import { Eye, EyeOff, Lock, Mail, Save, User } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { useTheme } from "../context/ThemeContext"
import auth from "../firebase/firebase.init"

const Profile = () => {
  const [user] = useAuthState(auth)
  const { isDark } = useTheme()
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        displayName: user.displayName || "",
        email: user.email || "",
      }))
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setMessage({ type: "", text: "" })
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setMessage({ type: "error", text: "Full name is required" })
      return false
    }
    if (!formData.email.trim()) {
      setMessage({ type: "error", text: "Email is required" })
      return false
    }
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" })
      return false
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters" })
      return false
    }
    if ((formData.newPassword || formData.email !== user?.email) && !formData.currentPassword) {
      setMessage({ type: "error", text: "Current password is required to change password or email" })
      return false
    }
    return true
  }

  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case "auth/wrong-password":
        return "Current password is incorrect"
      case "auth/email-already-in-use":
        return "Email is already in use by another account"
      case "auth/requires-recent-login":
        return "Please sign out and sign in again to update your profile"
      case "auth/invalid-email":
        return "Please enter a valid email address"
      case "auth/weak-password":
        return "Password should be at least 6 characters"
      case "auth/user-mismatch":
        return "The provided credentials do not match the current user"
      case "auth/user-not-found":
        return "User account not found"
      case "auth/invalid-credential":
        return "The provided credentials are invalid"
      case "auth/credential-already-in-use":
        return "This credential is already associated with a different user account"
      case "auth/operation-not-allowed":
        return "This operation is not allowed. Please contact support"
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later"
      default:
        return error.message || "Failed to update profile"
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const needsReauth = formData.email !== user.email || formData.newPassword

      if (needsReauth && formData.currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, formData.currentPassword)
        await reauthenticateWithCredential(user, credential)
      }

      // Update display name
      if (formData.displayName !== user.displayName) {
        await updateProfile(user, { displayName: formData.displayName })
      }

      if (formData.email !== user.email) {
        await updateEmail(user, formData.email)
      }

      // Update password if provided
      if (formData.newPassword) {
        await updatePassword(user, formData.newPassword)
      }

      setMessage({ type: "success", text: "Profile updated successfully!" })
      setFormData((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }))
      setShowConfirmDialog(false)
    } catch (error) {
      console.error("Profile update error:", error)
      const errorMessage = getFirebaseErrorMessage(error)
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      setShowConfirmDialog(true)
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className={`rounded-lg shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Profile Management</h1>
            <p className={`mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Update your personal information and account settings
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Full Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                <User className="inline h-4 w-4 mr-2" />
                Full Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                <Mail className="inline h-4 w-4 mr-2" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* Password Section */}
            <div className={`border-t pt-6 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <h3 className={`text-lg font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Change Password</h3>

              {/* Current Password */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <Lock className="inline h-4 w-4 mr-2" />
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="Enter new password (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("new")}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm")}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Message */}
            {message.text && (
              <div
                className={`p-3 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <div className="p-6">
              <h3 className={`text-lg font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Confirm Profile Changes
              </h3>
              <p className={`mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Are you sure you want to save the changes to your profile?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className={`px-4 py-2 rounded-lg border ${
                    isDark
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
