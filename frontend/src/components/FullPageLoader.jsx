
const FullPageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-95">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gray-900 mb-4"></div>
      <p className="text-gray-900 font-medium text-lg">Loading...</p>
    </div>
  );
};

export default FullPageLoader;
