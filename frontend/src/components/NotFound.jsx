import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-6">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-700">
        Page Not Found
      </h2>
      <p className="mt-2 text-gray-500">
        Sorry, the page you’re looking for doesn’t exist.
      </p>

      <Link
        to="/"
        className="mt-6 px-6 py-3 text-white bg-blue-600 rounded-xl shadow hover:bg-blue-700 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
