import React from "react";
import {
    createBrowserRouter,
    Navigate,
    Outlet,
    RouterProvider,
    useLocation,
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
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />; // Render the child routes
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

// Define the router with routes
const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
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
            // Add other protected routes here
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
    // Function to handle logout (optional, but good practice)
    const handleLogout = () => {
        localStorage.removeItem("authToken");
        window.location.reload(); // Simple way to force re-check
    };

    return <RouterProvider router={router} />;
}

export default AppWrapper;
