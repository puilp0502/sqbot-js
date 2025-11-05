import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";

interface LoginProps {
    onLoginSuccess?: () => void;
}

function Login({ onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Generate animation elements only once using useMemo
    const pulseElements = useMemo(
        () =>
            Array.from({ length: 20 }).map((_, i) => ({
                key: i,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 200 + 50}px`,
                height: `${Math.random() * 200 + 50}px`,
                delay: `${Math.random() * 5}s`,
                duration: `${Math.random() * 10 + 5}s`,
                opacity: Math.random() * 0.5,
                scale: `${Math.random() * 0.5 + 0.5}`,
            })),
        [],
    );

    const blobElements = useMemo(
        () =>
            Array.from({ length: 10 }).map((_, i) => ({
                key: i,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                delay: `${Math.random() * 10}s`,
                duration: `${Math.random() * 20 + 10}s`,
            })),
        [],
    );

    const handleLogin = (event: React.FormEvent) => {
        event.preventDefault();
        setError(""); // Clear previous errors

        if (!username || !password) {
            setError("Username and password are required.");
            return;
        }

        // Basic Authentication doesn't really "log in" to the backend in a session-based way.
        // We just store the credentials locally to be sent with future API requests.
        // Here, we'll store the Base64 encoded "token".
        const credentials = `${username}:${password}`;
        const encodedCredentials = btoa(credentials); // Base64 encode
        const basicAuthToken = `Basic ${encodedCredentials}`;

        // Store the token in local storage (or session storage)
        localStorage.setItem("authToken", basicAuthToken);

        console.log("Credentials stored locally.");
        // Call onLoginSuccess if provided
        if (onLoginSuccess) {
            onLoginSuccess();
        }
        // Use React Router's navigate for redirection
        navigate("/"); // Redirect to the home page (which will redirect to editor)
    };

    const handleDiscordLogin = () => {
        // Redirect to Discord OAuth endpoint
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
        window.location.href = `${apiBaseUrl}/auth/discord`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-0">
                <div className="absolute inset-0 overflow-hidden">
                    {pulseElements.map((el) => (
                        <div
                            key={el.key}
                            className="animate-pulse absolute rounded-full bg-white/20"
                            style={{
                                top: el.top,
                                left: el.left,
                                width: el.width,
                                height: el.height,
                                animationDelay: el.delay,
                                animationDuration: el.duration,
                                opacity: el.opacity,
                                transform: `scale(${el.scale})`,
                            }}
                        />
                    ))}
                </div>
                {blobElements.map((el) => (
                    <div
                        key={el.key}
                        className="absolute w-[150px] h-[150px] rounded-full bg-blue-200/20 animate-blob"
                        style={{
                            top: el.top,
                            left: el.left,
                            animationDelay: el.delay,
                            animationDuration: el.duration,
                        }}
                    />
                ))}
            </div>

            <Card className="w-full max-w-md mx-4 z-10 shadow-xl">
                <div className="flex justify-center -mt-12 mb-2">
                    <div className="rounded-full p-2 bg-white shadow-md">
                        <img
                            src="/profile.png"
                            alt="Bot Profile"
                            className="w-24 h-24 object-cover rounded-full"
                        />
                    </div>
                </div>
                <CardHeader className="space-y-3 pb-2">
                    <CardTitle className="text-2xl font-bold text-center">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-center text-gray-500">
                        SQBot: Discord Song Quiz Bot
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin} className="space-y-6 pt-4">
                    <CardContent className="space-y-6 pt-4">
                        <div className="space-y-3">
                            <Label
                                htmlFor="username"
                                className="text-sm font-medium"
                            >
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="아이디"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full h-11"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label
                                htmlFor="password"
                                className="text-sm font-medium"
                            >
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="비밀번호"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-11"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-500 text-center font-medium">
                                {error}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="pt-2 pb-6 flex flex-col space-y-4">
                        <Button
                            type="submit"
                            className="w-full h-11 bg-black hover:bg-gray-800 transition-all duration-300"
                        >
                            Sign in
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleDiscordLogin}
                            className="w-full h-11 bg-[#5865F2] hover:bg-[#4752C4] transition-all duration-300"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                            </svg>
                            Login with Discord
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default Login;
