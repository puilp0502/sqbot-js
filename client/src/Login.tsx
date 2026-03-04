import React, { useMemo } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";

interface LoginProps {
    onLoginSuccess?: () => void;
}

function Login({ onLoginSuccess }: LoginProps) {
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

    const handleDiscordLogin = () => {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
        // Strip /api suffix to get the server base URL
        const serverBaseUrl = apiBaseUrl.replace(/\/api$/, "");
        window.location.href = `${serverBaseUrl}/auth/discord`;
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
                <CardContent className="pt-4">
                    <CardFooter className="pt-2 pb-6">
                        <Button
                            type="button"
                            onClick={handleDiscordLogin}
                            className="w-full h-11 bg-[#5865F2] hover:bg-[#4752C4] transition-all duration-300 text-white"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            Login with Discord
                        </Button>
                    </CardFooter>
                </CardContent>
            </Card>
        </div>
    );
}

export default Login;
