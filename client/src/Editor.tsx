import React, { UIEvent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, FileText, GripVertical, Plus, Trash } from "lucide-react";

const SQBotEditor = () => {
    // Initial mock data based on the wireframe
    const [entries, setEntries] = useState([
        {
            id: "1",
            performer: "結束バンド (결속 밴드)",
            canonicalName: "비밀 기지",
            possibleAnswers: ["Himitsu Kichi", "ひみつ基地"],
            ytVideoId: "ztF1ru7LEzs",
            songStart: 39,
            playDuration: 50,
        },
        {
            id: "2",
            performer: "結束バンド (결속 밴드)",
            canonicalName: "그 밴드",
            possibleAnswers: ["That Band"],
            ytVideoId: "q-bCp4MxuYU",
            songStart: 43,
            playDuration: 50,
        },
    ]);

    const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
    const [currentEntry, setCurrentEntry] = useState(entries[0]);

    // Convert seconds to MM:SS format
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Parse MM:SS format to seconds
    const parseTime = (timeStr: string) => {
        if (!timeStr.includes(":")) return 0;
        const [mins, secs] = timeStr.split(":").map((num) => parseInt(num, 10));
        return mins * 60 + secs;
    };

    // Handle form input changes
    const handleChange = (field: string, value: any) => {
        const updatedEntry = { ...currentEntry, [field]: value };
        setCurrentEntry(updatedEntry);

        // Update in the entries array
        const updatedEntries = [...entries];
        updatedEntries[selectedEntryIndex] = updatedEntry;
        setEntries(updatedEntries);
    };

    // Handle answer changes
    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...currentEntry.possibleAnswers];
        newAnswers[index] = value;
        handleChange("possibleAnswers", newAnswers);
    };

    // Add a new blank answer
    const addAnswer = () => {
        const newAnswers = [...currentEntry.possibleAnswers, ""];
        handleChange("possibleAnswers", newAnswers);
    };

    // Remove an answer
    const removeAnswer = (index: number) => {
        const newAnswers = [...currentEntry.possibleAnswers];
        newAnswers.splice(index, 1);
        handleChange("possibleAnswers", newAnswers);
    };

    // Select an entry for editing
    const selectEntry = (index: number) => {
        setSelectedEntryIndex(index);
        setCurrentEntry(entries[index]);
    };

    // Add a new entry
    const addNewEntry = () => {
        const newEntry = {
            id: String(entries.length + 1),
            performer: "",
            canonicalName: "",
            possibleAnswers: [],
            ytVideoId: "",
            songStart: 0,
            playDuration: 50,
        };

        setEntries([...entries, newEntry]);
        setSelectedEntryIndex(entries.length);
        setCurrentEntry(newEntry);
    };

    // Delete an entry
    const deleteEntry = (index: number, e: UIEvent) => {
        e.stopPropagation(); // Prevent triggering selectEntry

        const newEntries = [...entries];
        newEntries.splice(index, 1);
        setEntries(newEntries);

        // If the currently selected entry is deleted or is after the deleted entry
        if (selectedEntryIndex >= index) {
            const newSelectedIndex = Math.max(0, selectedEntryIndex - 1);
            setSelectedEntryIndex(newSelectedIndex);
            setCurrentEntry(
                newEntries[newSelectedIndex] || {
                    id: "1",
                    performer: "",
                    canonicalName: "",
                    possibleAnswers: [],
                    ytVideoId: "",
                    songStart: 0,
                    playDuration: 50,
                },
            );
        }
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b">
                <div className="text-2xl font-bold text-red-500">
                    SQBot Editor
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center">
                        <Input
                            className="w-64 mr-2 font-medium"
                            value="봇치 더 락! OST 전곡"
                            onChange={(e) =>
                                console.log("Title changed:", e.target.value)}
                        />
                        <span className="text-gray-500">
                            Playlist ID: green-wumpus-touch-grass
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
            <div className="flex flex-1">
                {/* Left Column - YouTube Preview & Form */}
                <div className="w-1/2 border-r">
                    {/* YouTube Preview */}
                    <div className="border-b p-3">
                        {/* YouTube preview section */}
                        <div className="aspect-video bg-gray-900 flex items-center justify-center">
                            {currentEntry.ytVideoId
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
                                        {`<youtube embed here>`}
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Entry Form */}
                    <div className="p-4">
                        {/* Song information editor form */}

                        <div className="space-y-5">
                            <div>
                                <Label className="block text-sm mb-1">
                                    YouTube Video ID
                                </Label>
                                <Input
                                    value={currentEntry.ytVideoId}
                                    onChange={(e) =>
                                        handleChange(
                                            "ytVideoId",
                                            e.target.value,
                                        )}
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
                                            onClick={() => removeAnswer(index)}
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
                                                parseTime(e.target.value),
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
                                                currentEntry.playDuration,
                                        )}
                                        onChange={(e) => {
                                            const endTime = parseTime(
                                                e.target.value,
                                            );
                                            const duration = endTime -
                                                currentEntry.songStart;
                                            handleChange(
                                                "playDuration",
                                                duration > 0 ? duration : 0,
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Quiz Pack Entries */}
                <div className="w-1/2">
                    <div className="border-b p-3">
                        {/* Quiz Pack entries list */}
                    </div>

                    <div className="divide-y">
                        {entries.map((entry, index) => (
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
