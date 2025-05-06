import React from "react";
import {
    isRouteErrorResponse,
    useNavigate,
    useRouteError,
} from "react-router-dom";
import { AlertCircle, FileQuestion, Lock } from "lucide-react";

/**
 * Dedicated error boundary component for the Editor route.
 * Handles different error scenarios including 404, 401, and generic errors.
 */
export function EditorErrorBoundary() {
    const error = useRouteError();
    const navigate = useNavigate();

    // Helper to get a user-friendly error message
    const getErrorMessage = () => {
        if (isRouteErrorResponse(error)) {
            return error.data?.message || error.statusText ||
                "Unknown error occurred";
        }
        return error instanceof Error
            ? error.message
            : "An unexpected error occurred";
    };

    // 404 Not Found Error
    if (isRouteErrorResponse(error) && error.status === 404) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
                <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
                    <FileQuestion className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                    <h2 className="text-2xl font-bold mb-3 text-gray-800">
                        퀴즈 팩이 백룸으로 사라짐
                    </h2>
                    <p className="text-gray-600 mb-6">
                        퀴즈 팩이 없어졌거나, 애초부터 존재하지 않았거나,
                        <br />평행 세계에만 존재했을 수 있어요. (으스스하네요!)
                    </p>
                    <div className="flex flex-col space-y-2">
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            onClick={() =>
                                navigate("/editor/wumpus-touch-green-grass")}
                        >
                            Go to Default Pack
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                            onClick={() => navigate(-1)}
                        >
                            뒤로 가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 401/403 Authentication Error
    if (
        isRouteErrorResponse(error) &&
        (error.status === 401 || error.status === 403)
    ) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
                <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
                    <Lock className="h-16 w-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-3 text-gray-800">
                        로그인 필요
                    </h2>
                    <p className="text-gray-600 mb-6">
                        이 퀴즈 팩에 접근하려면 로그인이 필요해요.
                    </p>
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        onClick={() => navigate("/login")}
                    >
                        로그인 페이지로 가기
                    </button>
                </div>
            </div>
        );
    }

    // Generic Error (fallback)
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
                <h2 className="text-2xl font-bold mb-3 text-gray-800">
                    뭔가 잘못됐어요
                </h2>
                <p className="text-gray-600 mb-6">
                    {getErrorMessage()}
                </p>
                <div className="flex flex-col space-y-2">
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        다시 시도하기
                    </button>
                    <button
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                        onClick={() => navigate(-1)}
                    >
                        뒤로 가기
                    </button>
                </div>
            </div>
        </div>
    );
}
