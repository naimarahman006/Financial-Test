import { AlertCircle, CalendarCheck } from 'lucide-react';
import { useState } from 'react';

const YearEndButton = ({ onProcessYearEnd }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const handleConfirm = async () => {
        try {
            await onProcessYearEnd();
            setIsConfirming(false);
        } catch (error) {
            console.error("Year-end processing failed:", error);
        }
    };

    return (
        <div className="fixed bottom-6 right-6">
            {isConfirming ? (
                <div className="bg-white p-4 rounded-lg shadow-xl border border-red-300 max-w-xs">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-medium text-gray-900">Confirm Year End</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                This will close {currentYear} and start {nextYear}. All transactions will be archived.
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsConfirming(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                >
                    <CalendarCheck className="h-5 w-5" />
                    <span>Year-End Close</span>
                </button>
            )}
        </div>
    );
};

export default YearEndButton;