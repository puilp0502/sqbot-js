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
                    <CardFooter className="pt-2 pb-6">
                        <Button
                            type="submit"
                            className="w-full h-11 bg-black hover:bg-gray-800 transition-all duration-300"
                        >
                            Sign in
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default Login;
