import React from "react";
import {
    createBrowserRouter,
    Navigate,
    Outlet,
    RouterProvider,
    useLocation,
} from "react-router-dom";
import Login from "./Login";
import Editor from "./Editor";

// Helper component to protect routes
const ProtectedRoute: React.FC = () => {
    const location = useLocation();
    const token = localStorage.getItem("authToken");

    if (!token) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />; // Render the child route (Editor)
};

// Create an auth checker function for route objects
const checkAuth = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
        return redirect("/login");
    }
    return null;
};

// Redirect utility function
const redirect = (path: string) => {
    return {
        status: 302,
        headers: {
            Location: path,
        },
    };
};

// Define the router with routes
const router = createBrowserRouter([
    {
        path: "/login",
        element: (
            <Login
                onLoginSuccess={() => {
                    /* Placeholder, navigation handled by Login */
                }}
            />
        ),
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/editor/:packId",
                element: <Editor />,
                // Ready for future loader implementation
                // loader: ({ params }) => {
                //     return fetchPackData(params.packId);
                // },
            },
            // Add other protected routes here
        ],
    },
    {
        path: "/login-redirect",
        loader: () => {
            const token = localStorage.getItem("authToken");
            return token ? redirect("/") : redirect("/login");
        },
        element: null, // The element won't render as the loader will redirect
    },
    // Catch-all route redirecting to the login page
    {
        path: "*",
        loader: () => redirect("/login"),
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
