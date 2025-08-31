import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth"
import { useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import auth from "../firebase/firebase.init"

// ---------------- FullPageLoader Component ----------------
const FullPageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
    <style>{`
      .loader {
        border-top-color: #1f2937;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `}</style>
  </div>
)

function Signin() {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const togglePassword = () => {
    setPasswordVisible(!passwordVisible)
  }

  const [success, setSuccess] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false) // <-- Added loading state
  const emailRef = useRef()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    console.log(email, password)

    // reset state
    setSuccess(false)
    setLoginError("")
    setLoading(true) // <-- start loader

    // login user
    signInWithEmailAndPassword(auth, email, password)
      .then((result) => {
        console.log(result.user);
        setSuccess(true);
        setLoading(false); // <-- stop loader BEFORE navigating
        navigate("/dashboard"); // <-- navigate after loader stops
      })
      .catch((error) => {
        console.log("ERROR", error.message);
        setLoginError(error.message);
        setLoading(false); // <-- stop loader on error
      });
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const form = e.target.closest("form")
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
      }
    }
  }

  const handleForgetPassword = () => {
    console.log("Get me email address", emailRef.current.value)
    const email = emailRef.current.value

    if (!email) {
      console.log("Please Provide a Valid Email Address")
    } else {
      sendPasswordResetEmail(auth, email).then(() => {
        alert("Password Reset Email Sent")
      })
    }
  }

  // Show loader if login is in progress
  if (loading) return <FullPageLoader />

  return (
    <div className="flex items-center justify-center p-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] bg-white p-6 rounded-lg shadow-lg">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-gray-500">Enter your email below to sign in to your account</p>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none" htmlFor="email">
                  Email
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                  ref={emailRef}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium leading-none" htmlFor="password" name="password">
                    Password
                  </label>
                  <a
                    href="#"
                    onClick={handleForgetPassword}
                    className="ml-auto inline-block text-sm underline text-gray-500 hover:text-gray-900"
                  >
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                    id="password"
                    name="password"
                    required
                    type={passwordVisible ? "text" : "password"}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <i
                      className={`fas ${passwordVisible ? "fa-eye" : "fa-eye-slash"} text-gray-400 cursor-pointer`}
                      onClick={togglePassword}
                    ></i>
                  </div>
                </div>
              </div>

              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 h-10 px-4 py-2 w-full">
                Sign In
              </button>
            </div>
          </form>

          {success && <p className="text-green-700">User Login Successfully</p>}

          {loginError && <p className="text-red-700">{loginError}</p>}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
          </div>
        </div>

        <p className="px-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="underline underline-offset-4 hover:text-primary">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signin
