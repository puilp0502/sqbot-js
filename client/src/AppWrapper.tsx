import React, { useEffect } from "react";
import {
    createBrowserRouter,
    Navigate,
    Outlet,
    RouterProvider,
    useLocation,
    useNavigate,
    useSearchParams,
    redirect,
} from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import Editor, { loader as editorLoader, action as editorAction } from "./Editor";
import { EditorErrorBoundary } from "./components/EditorErrorBoundary";
import { checkAuthStatus, requireAuth } from "./lib/api";
import { v4 as uuidv4 } from "uuid";

// Helper component to protect routes
const ProtectedRoute: React.FC = () => {
    const location = useLocation();
    const isAuthenticated = checkAuthStatus();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

// Auth loader for route objects
const authLoader = async () => {
    try {
        requireAuth();
        return null;
    } catch (error) {
        return redirect("/login");
    }
};

// Component to handle the OAuth callback
function LoginCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get("token");
        if (token) {
            localStorage.setItem("authToken", `Bearer ${token}`);
            navigate("/", { replace: true });
        } else {
            navigate("/login", { replace: true });
        }
    }, [searchParams, navigate]);

    return null;
}

// Define the router with routes
const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/login/callback",
        element: <LoginCallback />,
    },
    {
        path: "/",
        element: <ProtectedRoute />,
        loader: authLoader,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: "editor/new",
                element: <Editor />,
                loader: editorLoader,
                action: editorAction,
                errorElement: <EditorErrorBoundary />,
            },
            {
                path: "editor/:packId",
                element: <Editor />,
                loader: editorLoader,
                action: editorAction,
                errorElement: <EditorErrorBoundary />,
            },
        ],
    },
    // Catch-all route redirecting to the home page
    {
        path: "*",
        loader: () => redirect("/"),
        element: null,
    },
]);

function AppWrapper() {
    return <RouterProvider router={router} />;
}

export default AppWrapper;
