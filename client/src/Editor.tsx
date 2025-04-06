import React, { UIEvent, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, FileText, GripVertical, Plus, Trash } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface QuizEntry {
    id: string; // UUID
    performer: string;
    canonicalName: string;
    possibleAnswers: string[];
    ytVideoId: string;
    songStart: number; // in seconds
    playDuration: number; // in seconds
}

// Interface for a quiz pack
interface QuizPack {
    id: string; // UUID
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    entries: QuizEntry[];
}

// API functions
const API_BASE_URL = "http://localhost:3001/api"; // Adjust based on your setup

async function fetchQuizPack(packId: string): Promise<QuizPack> {
    const response = await fetch(`${API_BASE_URL}/${packId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch quiz pack");
    }
    return response.json();
}

async function updateQuizPack(packId: string, pack: QuizPack): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${packId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(pack),
    });
    if (!response.ok) {
        throw new Error("Failed to update quiz pack");
    }
}

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
): T {
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            setTimeoutId(
                setTimeout(() => {
                    callback(...args);
                    setTimeoutId(null);
                }, delay),
            );
        },
        [callback, delay],
    ) as T;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    return debouncedCallback;
}

const SQBotEditor = () => {
    const [quizPack, setQuizPack] = useState<QuizPack>({
        id: "green-wumpus-touch-grass", // Default ID
        name: "봇치 더 락! OST 전곡",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: [],
    });
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
    const [currentEntry, setCurrentEntry] = useState<QuizEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Create a debounced save function
    const debouncedSave = useDebounce(async (packToSave: QuizPack) => {
        try {
            setIsSaving(true);
            await updateQuizPack(packToSave.id, packToSave);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to save changes",
            );
        } finally {
            setIsSaving(false);
        }
    }, 5000); // 5 second delay

    // Load quiz pack data on mount
    useEffect(() => {
        const loadQuizPack = async () => {
            try {
                setLoading(true);
                // Extract pack ID from URL path
                const pathSegments = window.location.pathname.split("/");
                const packId = pathSegments[1] || quizPack.id; // Use the first segment after the domain, fallback to default
                const pack = await fetchQuizPack(packId);
                setQuizPack(pack);
                if (pack.entries.length > 0) {
                    setCurrentEntry(pack.entries[0]);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load quiz pack",
                );
            } finally {
                setLoading(false);
            }
        };

        loadQuizPack();
    }, []);

    // Handle form input changes
    const handleChange = (field: string, value: any) => {
        if (!currentEntry) return;

        const updatedEntry = { ...currentEntry, [field]: value };
        setCurrentEntry(updatedEntry);

        // Update in the entries array
        const updatedEntries = [...quizPack.entries];
        updatedEntries[selectedEntryIndex] = updatedEntry;

        const updatedPack = {
            ...quizPack,
            entries: updatedEntries,
            updatedAt: new Date(),
        };

        setQuizPack(updatedPack);

        // Trigger debounced save
        debouncedSave(updatedPack);
    };

    const handleVideoIdChange = (value: string) => {
        // Check if the value is a YouTube URL and extract the video ID
        const youtubeShortRegex = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]+)/;
        const youtubeWatchRegex =
            /^https:\/\/www.youtube.com\/watch\?v=([A-Za-z0-9_-]+)/;
        const shortMatch = value.match(youtubeShortRegex);
        const watchMatch = value.match(youtubeWatchRegex);

        console.log(shortMatch, watchMatch);
        const match = shortMatch || watchMatch;

        if (match) {
            // If it's a YouTube URL, extract the video ID and update
            const videoId = match[1];
            handleChange("ytVideoId", videoId);
        } else {
            // Otherwise, just update the value as-is
            handleChange("ytVideoId", value);
        }
    };

    // Handle answer changes
    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...currentEntry!.possibleAnswers];
        newAnswers[index] = value;
        handleChange("possibleAnswers", newAnswers);
    };

    // Add a new blank answer
    const addAnswer = () => {
        const newAnswers = [...currentEntry!.possibleAnswers, ""];
        handleChange("possibleAnswers", newAnswers);
    };

    // Remove an answer
    const removeAnswer = (index: number) => {
        const newAnswers = [...currentEntry!.possibleAnswers];
        newAnswers.splice(index, 1);
        handleChange("possibleAnswers", newAnswers);
    };

    // Select an entry for editing
    const selectEntry = (index: number) => {
        setSelectedEntryIndex(index);
        setCurrentEntry(quizPack.entries[index]);
    };

    // Add a new entry
    const addNewEntry = () => {
        const newEntry: QuizEntry = {
            id: uuidv4(),
            performer: "",
            canonicalName: "",
            possibleAnswers: [],
            ytVideoId: "",
            songStart: 0,
            playDuration: 50,
        };

        const updatedPack = {
            ...quizPack,
            entries: [...quizPack.entries, newEntry],
            updatedAt: new Date(),
        };

        setQuizPack(updatedPack);
        setSelectedEntryIndex(quizPack.entries.length);
        setCurrentEntry(newEntry);

        // Trigger debounced save
        debouncedSave(updatedPack);
    };

    // Delete an entry
    const deleteEntry = (index: number, e: UIEvent) => {
        e.stopPropagation();

        const updatedEntries = quizPack.entries.filter((_, i) => i !== index);
        const updatedPack = {
            ...quizPack,
            entries: updatedEntries,
            updatedAt: new Date(),
        };

        setQuizPack(updatedPack);

        if (selectedEntryIndex >= index) {
            const newSelectedIndex = Math.max(0, selectedEntryIndex - 1);
            setSelectedEntryIndex(newSelectedIndex);
            setCurrentEntry(updatedEntries[newSelectedIndex] || null);
        }

        // Trigger debounced save
        debouncedSave(updatedPack);
    };

    // Format and parse time functions remain the same
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const parseTime = (timeStr: string) => {
        if (!timeStr.includes(":")) return 0;
        const [mins, secs] = timeStr.split(":").map((num) => parseInt(num, 10));
        return mins * 60 + secs;
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b h-14">
                <div className="text-2xl font-bold text-red-500">
                    SQBot Editor
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center">
                        <Input
                            className="w-64 mr-2 font-medium"
                            value={quizPack.name}
                            onChange={(e) => {
                                const updatedPack = {
                                    ...quizPack,
                                    name: e.target.value,
                                    updatedAt: new Date(),
                                };
                                setQuizPack(updatedPack);
                                debouncedSave(updatedPack);
                            }}
                        />
                        <span className="text-gray-500">
                            Playlist ID: {quizPack.id}
                            {isSaving && (
                                <span className="ml-2 text-blue-500">
                                    저장 중...
                                </span>
                            )}
                            {error && (
                                <span className="ml-2 text-red-500">
                                    {error}
                                </span>
                            )}
                        </span>
                    </div>
                    <Button variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                        <FileText className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 h-[calc(100vh-20*var(--spacing))]">
                {/* Left Column - YouTube Preview & Form */}
                <div className="w-1/2 border-r flex flex-col">
                    {/* YouTube Preview */}
                    <div className="border-b p-3">
                        {/* YouTube preview section */}
                        <div className="aspect-video bg-gray-900 flex items-center justify-center">
                            {currentEntry?.ytVideoId
                                ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${currentEntry.ytVideoId}?start=${currentEntry.songStart}`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    >
                                    </iframe>
                                )
                                : (
                                    <div className="text-white text-lg">
                                        Video Preview will display here
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Entry Form */}
                    <div className="p-4 flex-grow-0 flex-basis-auto overflow-y-auto">
                        {/* Song information editor form */}

                        {currentEntry
                            ? (
                                <div className="space-y-5">
                                    <div>
                                        <Label className="block text-sm mb-1">
                                            YouTube Video ID / URL
                                        </Label>
                                        <Input
                                            value={currentEntry.ytVideoId}
                                            onChange={(e) =>
                                                handleVideoIdChange(
                                                    e.target.value,
                                                )}
                                            onFocus={(e) => {
                                                e.target.select();
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <Label className="block text-sm mb-1">
                                            가수명
                                        </Label>
                                        <Input
                                            value={currentEntry.performer}
                                            onChange={(e) =>
                                                handleChange(
                                                    "performer",
                                                    e.target.value,
                                                )}
                                        />
                                    </div>

                                    <div>
                                        <Label className="block text-sm mb-1">
                                            노래 제목
                                        </Label>
                                        <Input
                                            value={currentEntry.canonicalName}
                                            onChange={(e) =>
                                                handleChange(
                                                    "canonicalName",
                                                    e.target.value,
                                                )}
                                        />
                                    </div>

                                    <div>
                                        <Label className="block text-sm mb-1">
                                            복수정답
                                        </Label>
                                        {currentEntry.possibleAnswers.map((
                                            answer,
                                            index,
                                        ) => (
                                            <div
                                                key={index}
                                                className="flex items-center mt-2 group"
                                            >
                                                <Input
                                                    value={answer}
                                                    onChange={(e) =>
                                                        handleAnswerChange(
                                                            index,
                                                            e.target.value,
                                                        )}
                                                />
                                                <button
                                                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                                    onClick={() =>
                                                        removeAnswer(index)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            className="mt-2 text-sm hover:bg-gray-100"
                                            onClick={addAnswer}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            정답 추가
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="block text-sm mb-1">
                                                재생 시작
                                            </Label>
                                            <Input
                                                value={formatTime(
                                                    currentEntry.songStart,
                                                )}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "songStart",
                                                        parseTime(
                                                            e.target.value,
                                                        ),
                                                    )}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm mb-1">
                                                재생 종료
                                            </Label>
                                            <Input
                                                value={formatTime(
                                                    currentEntry.songStart +
                                                        currentEntry
                                                            .playDuration,
                                                )}
                                                onChange={(e) => {
                                                    const endTime = parseTime(
                                                        e.target.value,
                                                    );
                                                    const duration = endTime -
                                                        currentEntry.songStart;
                                                    handleChange(
                                                        "playDuration",
                                                        duration > 0
                                                            ? duration
                                                            : 0,
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                            : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                                    곡 추가해서 편집 시작
                                </div>
                            )}
                    </div>
                </div>

                {/* Right Column - Quiz Pack Entries */}
                <div className="w-1/2">
                    <div className="border-b p-3">
                        {/* Quiz Pack entries list */}
                    </div>

                    <div className="divide-y">
                        {quizPack.entries.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`p-4 flex items-center cursor-pointer relative group ${
                                    index === selectedEntryIndex
                                        ? "bg-gray-100"
                                        : "hover:bg-gray-50"
                                }`}
                                onClick={() => selectEntry(index)}
                            >
                                <div className="flex items-center flex-1">
                                    <GripVertical className="h-5 w-5 mr-2 text-gray-400 cursor-grab" />
                                    <div className="mr-2 font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {entry.performer} -{" "}
                                            {entry.canonicalName}
                                        </div>
                                        <div className="text-sm text-blue-500">
                                            https://youtu.be/{entry
                                                .ytVideoId}?t={entry.songStart}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => deleteEntry(index, e)}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 flex justify-center">
                        <Button
                            onClick={addNewEntry}
                            variant="outline"
                            className="flex items-center"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            곡 추가
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SQBotEditor;
