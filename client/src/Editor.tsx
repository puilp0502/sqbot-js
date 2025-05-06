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
    FolderOpen,
    GripVertical,
    Music,
    Plus,
    Save,
    Search,
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
import { SaveButton, SaveButtonRef } from "./SaveButton";
import { useDebounce } from "@/lib/hooks";
import {
    ActionFunctionArgs,
    Link,
    LoaderFunctionArgs,
    redirect,
    useActionData,
    useLoaderData,
    useNavigate,
    useNavigation,
    useSubmit,
} from "react-router-dom";
import PlaylistListModal from "./PlaylistListModal";
import TagEditor from "./TagEditor";

import { createQuizPack, fetchQuizPack, updateQuizPack } from "./lib/api";

// Loader function for React Router
export async function loader({ params }: LoaderFunctionArgs) {
    const packId = params.packId;
    if (!packId) {
        throw new Response("Pack ID not found", { status: 404 });
    }

    try {
        // Fetch the existing quiz pack
        const quizPack = await fetchQuizPack(packId);
        return quizPack;
    } catch (error) {
        if (error instanceof Response) {
            if (error.status === 401) {
                return redirect("/login");
            }
            throw error;
        }

        console.error("Loader error:", error);
        throw new Response(
            error instanceof Error ? error.message : "Failed to load quiz pack",
            { status: 500 },
        );
    }
}

// Action function for form submission
export async function action({ request, params }: ActionFunctionArgs) {
    const packId = params.packId;
    if (!packId) {
        throw new Response("Pack ID not found", { status: 404 });
    }

    const formData = await request.formData();
    const intent = formData.get("intent")?.toString();

    try {
        // Handle different types of form submissions
        if (intent === "save") {
            const packData = JSON.parse(formData.get("packData") as string);

            // Update existing pack
            await updateQuizPack(packId, packData);
            return { success: true };
        }

        // Handle entry operations
        if (intent === "addEntry") {
            const packData = JSON.parse(formData.get("packData") as string);
            const newEntry = {
                id: uuidv4(),
                performer: "",
                canonicalName: "",
                possibleAnswers: [],
                ytVideoId: "",
                songStart: 0,
                playDuration: -1,
            };

            packData.entries.push(newEntry);
            packData.updatedAt = new Date();

            await updateQuizPack(packId, packData);
            return {
                success: true,
                newEntryIndex: packData.entries.length - 1,
            };
        }

        if (intent === "deleteEntry") {
            const packData = JSON.parse(formData.get("packData") as string);
            const entryIndex = parseInt(formData.get("entryIndex") as string);

            packData.entries.splice(entryIndex, 1);
            packData.updatedAt = new Date();

            await updateQuizPack(packId, packData);
            return { success: true };
        }

        return { success: false, message: "Unknown intent" };
    } catch (error) {
        console.error("Action error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Action failed",
        };
    }
}

const SQBotEditor = () => {
    // Use the loader data
    const quizPack = useLoaderData() as QuizPack;
    const navigation = useNavigation();
    const navigate = useNavigate();
    const submit = useSubmit();
    const actionData = useActionData() as {
        success?: boolean;
        message?: string;
        newEntryIndex?: number;
    } | undefined;

    // Local state synced with loader data
    const [localPack, setLocalPack] = useState<QuizPack>(quizPack);
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const saveButtonRef = useRef<SaveButtonRef>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Update local state when loader data changes
    useEffect(() => {
        setLocalPack(quizPack);
    }, [quizPack]);

    // Update entry index when a new entry is added
    useEffect(() => {
        if (actionData?.success && actionData?.newEntryIndex !== undefined) {
            setSelectedEntryIndex(actionData.newEntryIndex);
        }
    }, [actionData]);

    // Check if we're in a loading state
    const isLoading = navigation.state === "loading";

    const currentEntry = selectedEntryIndex < localPack.entries.length
        ? localPack.entries[selectedEntryIndex]
        : null;

    // Submit changes to the action handler directly without page reload
    const saveImmediate = async (throwError: boolean = false) => {
        try {
            setIsSaving(true);

            // call the API directly
            await updateQuizPack(localPack.id, localPack);

            // When submitting through the save button, show success
            if (saveButtonRef.current) {
                saveButtonRef.current.setSuccess();
            }
        } catch (err) {
            // Show error in toast and in button
            toast(
                err instanceof Error ? err.message : "Failed to save changes",
            );
            if (saveButtonRef.current) {
                saveButtonRef.current.setError();
            }
            if (throwError) {
                throw err;
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Create a debounced save function
    const debouncedSave = useDebounce(() => {
        if (saveButtonRef.current === null) {
            // if we somehow don't have reference to save button, call saveImmediate directly
            saveImmediate();
            return;
        }

        // Use the SaveButton's built-in save function by triggering a click on it
        // This ensures we go through the proper UI flow
        saveButtonRef.current.startSave();
    }, 3000); // 3 second delay

    // We don't need an adapter anymore, as we've updated the Entries component

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

        // Update in the entries array
        const updatedEntries = [...localPack.entries];
        updatedEntries[selectedEntryIndex] = updatedEntry;

        const updatedPack = {
            ...localPack,
            entries: updatedEntries,
            updatedAt: new Date(),
        };

        setLocalPack(updatedPack);

        // Trigger debounced save
        debouncedSave();
    };

    const handleVideoIdChange = (value: string) => {
        // Check if the value is a YouTube URL and extract the video ID
        const youtubeShortRegex = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]+)/;
        const youtubeWatchRegex =
            /^https:\/\/www.youtube.com\/watch\?v=([A-Za-z0-9_-]+)/;
        const shortMatch = value.match(youtubeShortRegex);
        const watchMatch = value.match(youtubeWatchRegex);

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

    // Add a new entry with optimistic UI update and debounced save
    const addNewEntry = () => {
        // Create a new entry
        const newEntry: QuizEntry = {
            id: uuidv4(),
            performer: "",
            canonicalName: "",
            possibleAnswers: [],
            ytVideoId: "",
            songStart: 0,
            playDuration: -1,
        };

        // Update local state immediately (optimistic update)
        const updatedPack = {
            ...localPack,
            entries: [...localPack.entries, newEntry],
            updatedAt: new Date(),
        };

        // Update local state and set the selection to the new entry
        setLocalPack(updatedPack);
        setSelectedEntryIndex(localPack.entries.length); // Set to the new entry's index

        // Trigger the debounced save to update the server with the changes
        debouncedSave();
    };

    // Delete an entry with optimistic UI update and debounced save
    const deleteEntry = (index: number, e?: UIEvent) => {
        e?.stopPropagation();

        // Update local state immediately (optimistic update)
        const updatedEntries = localPack.entries.filter((_, i) => i !== index);
        const updatedPack = {
            ...localPack,
            entries: updatedEntries,
            updatedAt: new Date(),
        };

        setLocalPack(updatedPack);

        // Update selected index if needed
        if (selectedEntryIndex >= index) {
            const newSelectedIndex = Math.max(0, selectedEntryIndex - 1);
            setSelectedEntryIndex(newSelectedIndex);
        }

        // Trigger the debounced save to update the server with the changes
        debouncedSave();
    };

    // Handle keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setModalOpen(true);
            } else if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                saveButtonRef.current?.startSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Handle selecting a playlist from the modal
    const handleSelectPlaylist = (playlistId: string) => {
        if (playlistId === quizPack.id) {
            setModalOpen(false);
            return;
        }

        // Navigate to the selected playlist
        navigate(`/editor/${playlistId}`);
        setModalOpen(false);
    };

    // Show loading state if needed
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mx-auto">
                    </div>
                    <p className="mt-4 text-lg font-medium">
                        Loading quiz pack...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="container flex items-center justify-between h-16 px-4 mx-auto">
                    <Link to="/" className="text-2xl font-bold text-red-500">
                        SQBot Editor
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Input
                                className="w-64 font-medium"
                                value={localPack.name}
                                onChange={(e) => {
                                    const updatedPack = {
                                        ...localPack,
                                        name: e.target.value,
                                        updatedAt: new Date(),
                                    };
                                    setLocalPack(updatedPack);
                                    debouncedSave();
                                }}
                            />
                            <div className="flex items-center gap-1 px-2 text-sm text-gray-500 bg-gray-100 rounded">
                                <span>Playlist ID:</span>
                                <span className="font-medium">
                                    {localPack.id}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            localPack.id,
                                        );
                                        toast("Pack ID has been copied!");
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 cursor-pointer"
                            onClick={() => setModalOpen(true)}
                        >
                            <div className="relative flex items-center justify-center h-4 w-4">
                                <FolderOpen className="h-4 w-4" />
                            </div>
                            Browse
                        </Button>
                        <SaveButton
                            minLoadingDuration={500}
                            // Don't use the button's internal save function
                            // as we handle that manually in startSave
                            onSave={async () => {
                                return saveImmediate(true);
                            }}
                            ref={saveButtonRef}
                        />
                    </div>
                </div>
            </header>

            {/* Playlist Browse Modal */}
            <PlaylistListModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSelectPlaylist={handleSelectPlaylist}
            />

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
                                                        placeholder={"e.g., Rick Astley"}
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
                                                            placeholder={"e.g., Never Gonna Give You Up"}
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
                                            곡 목록 ({localPack.entries.length})
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="settings"
                                            className="text-sm"
                                        >
                                            플레이리스트 설정
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="entries">
                                    <DraggableQuizEntries
                                        quizPack={localPack}
                                        setQuizPack={setLocalPack}
                                        debouncedSave={debouncedSave}
                                        selectedEntryIndex={selectedEntryIndex}
                                        selectEntry={selectEntry}
                                        addNewEntry={addNewEntry}
                                        deleteEntry={deleteEntry}
                                    />
                                </TabsContent>
                                <TabsContent
                                    value="settings"
                                    className="p-6 space-y-6 border-t m-0"
                                >
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">
                                            플레이리스트 설명
                                        </label>
                                        <textarea
                                            className="w-full h-24 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="플레이리스트의 컨셉 등"
                                            value={localPack.description}
                                            onChange={(e) => {
                                                const updatedPack = {
                                                    ...localPack,
                                                    description: e.target.value,
                                                    updatedAt: new Date(),
                                                };
                                                setLocalPack(updatedPack);
                                                debouncedSave();
                                            }}
                                        >
                                        </textarea>
                                    </div>

                                    <TagEditor
                                        quizPack={localPack}
                                        onChange={(updatedPack) => {
                                            setLocalPack(updatedPack);
                                            debouncedSave();
                                        }}
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
