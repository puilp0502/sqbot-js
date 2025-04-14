import {
    FocusEvent,
    SetStateAction,
    UIEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Clock,
    Copy,
    FileText,
    GripVertical,
    Music,
    Plus,
    Save,
    Trash,
    User,
    X,
    Youtube,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { QuizEntry, QuizPack } from "./types";
import DraggableQuizEntries from "./Entries";
import { Card, CardContent } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { TimeRangeInput } from "./TimeInput";

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
        name: "",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: [],
    });
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const currentEntry = selectedEntryIndex < quizPack.entries.length
        ? quizPack.entries[selectedEntryIndex]
        : null;

    const saveImmediate = async (packToSave: QuizPack) => {
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
    };
    // Create a debounced save function
    const debouncedSave = useDebounce(async (packToSave: QuizPack) => {
        saveImmediate(packToSave);
    }, 3000); // 5 second delay

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

    type QuizEntryChanges = {
        key: keyof QuizEntry;
        value: any;
    };
    // Handle form input changes
    const handleChange = (
        changes: keyof QuizEntry | Partial<QuizEntry>,
        value?: any,
    ) => {
        if (!currentEntry) return;
        let changesSet: Partial<QuizEntry> = {};
        if (typeof changes === "string" && value !== undefined) {
            changesSet[changes] = value;
        } else {
            changesSet = changes as Partial<QuizEntry>;
        }

        const updatedEntry = Object.entries(changesSet).reduce(
            (entry, [key, value]) => ({
                ...entry,
                [key]: value,
            }),
            { ...currentEntry },
        );

        console.log("handleChange: updatedEntry:", updatedEntry);
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
            playDuration: -1,
        };

        const updatedPack = {
            ...quizPack,
            entries: [...quizPack.entries, newEntry],
            updatedAt: new Date(),
        };

        setQuizPack(updatedPack);
        setSelectedEntryIndex(quizPack.entries.length);

        // Trigger debounced save
        debouncedSave(updatedPack);
    };

    // Delete an entry
    const deleteEntry = (index: number, e?: UIEvent) => {
        e?.stopPropagation();

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
        }

        // Trigger debounced save
        debouncedSave(updatedPack);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="container flex items-center justify-between h-16 px-4 mx-auto">
                    <h1 className="text-2xl font-bold text-red-500">
                        SQBot Editor
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Input
                                className="w-64 font-medium"
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
                            <div className="flex items-center gap-1 px-2 text-sm text-gray-500 bg-gray-100 rounded">
                                <span>Playlist ID:</span>
                                <span className="font-medium">
                                    {quizPack.id}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            quizPack.id,
                                        );
                                        toast("Pack ID has been copied!");
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
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
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 pointer-cursor"
                        >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - YouTube Preview & Form */}
                <div className="space-y-6">
                    {/* YouTube Preview */}
                    <Card className="overflow-hidden">
                        {/* YouTube preview section */}
                        <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
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
                                    <div className="text-white/70 text-center">
                                        <Youtube className="w-12 h-12 mx-auto mb-2 opacity-50">
                                        </Youtube>
                                        Video Preview will display here
                                    </div>
                                )}
                        </div>
                    </Card>

                    {/* Entry Form */}
                    <Card className="flex-grow-0 flex-basis-auto overflow-y-auto">
                        {/* Song information editor form */}
                        <CardContent className="p-6 space-y-6">
                            {currentEntry
                                ? (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Youtube className="w-4 h-4 text-red-500" />
                                                    <Label className="block text-sm mb-1">
                                                        YouTube Video ID / URL
                                                    </Label>
                                                </div>
                                                <Input
                                                    value={currentEntry
                                                        .ytVideoId}
                                                    onChange={(e) =>
                                                        handleVideoIdChange(
                                                            e.target.value,
                                                        )}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    placeholder="e.g., dQw4w9WgXcQ"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-blue-500" />
                                                        <Label className="block text-sm">
                                                            가수명
                                                        </Label>
                                                    </div>
                                                    <Input
                                                        value={currentEntry
                                                            .performer}
                                                        onChange={(e) =>
                                                            handleChange(
                                                                "performer",
                                                                e.target.value,
                                                            )}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Music className="w-4 h-4 text-purple-500" />
                                                            <Label className="block text-sm">
                                                                노래 제목
                                                            </Label>
                                                        </div>
                                                        <Input
                                                            value={currentEntry
                                                                .canonicalName}
                                                            onChange={(e) =>
                                                                handleChange(
                                                                    "canonicalName",
                                                                    e.target
                                                                        .value,
                                                                )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-green-500" />
                                                <Label className="block text-sm">
                                                    복수정답
                                                </Label>
                                            </div>
                                            {currentEntry.possibleAnswers
                                                .map((
                                                    answer,
                                                    index,
                                                ) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center mt-2 group gap-2"
                                                    >
                                                        <Input
                                                            value={answer}
                                                            onChange={(e) =>
                                                                handleAnswerChange(
                                                                    index,
                                                                    e.target
                                                                        .value,
                                                                )}
                                                            placeholder={`복수정답 ${
                                                                index + 1
                                                            }`}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            className="h-9 w-9 text-gray-400 hover:text-red-500"
                                                            onClick={() =>
                                                                removeAnswer(
                                                                    index,
                                                                )}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            <Button
                                                variant="ghost"
                                                className="mt-2 text-sm"
                                                onClick={addAnswer}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                정답 추가
                                            </Button>
                                        </div>

                                        <Separator />
                                        <TimeRangeInput
                                            entry={currentEntry}
                                            onTimeRangeChange={(
                                                start,
                                                duration,
                                            ) => {
                                                handleChange({
                                                    songStart: start,
                                                    playDuration: duration,
                                                });
                                            }}
                                        />
                                    </div>
                                )
                                : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                                        곡 추가해서 편집 시작
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Quiz Pack Entries */}
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <Tabs defaultValue="entries" className="w-full">
                                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                                    <TabsList>
                                        <TabsTrigger
                                            value="entries"
                                            className="text-sm"
                                        >
                                            Entries
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="settings"
                                            className="text-sm"
                                        >
                                            Pack Settings
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="entries">
                                    <DraggableQuizEntries
                                        quizPack={quizPack}
                                        setQuizPack={setQuizPack}
                                        debouncedSave={debouncedSave}
                                        selectedEntryIndex={selectedEntryIndex}
                                        selectEntry={selectEntry}
                                        addNewEntry={addNewEntry}
                                        deleteEntry={deleteEntry}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default SQBotEditor;
