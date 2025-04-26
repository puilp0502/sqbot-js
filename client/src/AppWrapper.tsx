import React, { useEffect, useState } from "react";
import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
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

function AppWrapper() {
    // We don't need a separate isAuthenticated state, we can just check localStorage
    // directly in the ProtectedRoute and when deciding initial route.
    // const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));

    // This function will be passed to the Login component
    // const handleLoginSuccess = () => {
    // setIsAuthenticated(true);
    // No need to manually set state, ProtectedRoute handles redirection based on token
    // };

    // Function to handle logout (optional, but good practice)
    const handleLogout = () => {
        localStorage.removeItem("authToken");
        // setIsAuthenticated(false);
        // Force a re-render or navigate to login if needed,
        // but often letting ProtectedRoute handle it on next navigation is sufficient.
        window.location.reload(); // Simple way to force re-check
    };

    return (
        <>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <Login
                            onLoginSuccess={() => {
                                /* Placeholder, navigation handled by Login */
                            }}
                        />
                    }
                />
                <Route element={<ProtectedRoute />}>
                    {/* Routes inside here require authentication */}
                    <Route path="/editor/:packId" element={<Editor />} />
                    {/* Add other protected routes here */}
                </Route>
                {/* Optional: Redirect authenticated users from /login to / */}
                <Route
                    path="/login-redirect"
                    element={localStorage.getItem("authToken")
                        ? <Navigate to="/" replace />
                        : <Navigate to="/login" replace />}
                />
            </Routes>
        </>
    );
}

export default AppWrapper;
