import { Dispatch, SetStateAction, UIEvent, useState } from "react";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash } from "lucide-react";
import { QuizEntry, QuizPack } from "./types";
import { Button } from "./components/ui/button";

// Example quiz entry data based on your SQBot project
const initialEntries = [
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
        ytVideoId: "nxnxnxnxnx",
        songStart: 39,
        playDuration: 50,
    },
    {
        id: "3",
        performer: "YOASOBI",
        canonicalName: "Idol",
        possibleAnswers: ["아이돌", "アイドル"],
        ytVideoId: "ZRtdQ81jPUQ",
        songStart: 60,
        playDuration: 30,
    },
];

// Sortable item component
const SortableEntry = (
    { entry, index, selectedEntryIndex, onSelect, onDelete }: {
        entry: QuizEntry;
        index: number;
        selectedEntryIndex: number;
        onSelect: (index: number) => void;
        onDelete: (index: number, e: UIEvent) => void;
    },
) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: entry.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-4 flex items-center cursor-pointer relative ${
                index === selectedEntryIndex
                    ? "bg-gray-100"
                    : "hover:bg-gray-50"
            }`}
            onClick={() => onSelect(index)}
        >
            <div className="flex items-center flex-1">
                <div
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5 mr-2 text-gray-400 cursor-grab" />
                </div>
                <div className="mr-2 font-bold">{index + 1}</div>
                <div className="flex-1">
                    <div className="font-medium">
                        {entry.performer} - {entry.canonicalName}
                    </div>
                    <div className="text-sm text-blue-500">
                        https://youtu.be/{entry.ytVideoId}?t={entry.songStart}
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-1">
                <button
                    className="text-gray-400 hover:text-gray-700"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(index, e);
                    }}
                >
                    <Trash className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

// Main component
const DraggableQuizEntries = (
    {
        quizPack,
        setQuizPack,
        selectedEntryIndex,
        selectEntry,
        addNewEntry,
        deleteEntry,
        debouncedSave,
    }: {
        quizPack: QuizPack;
        setQuizPack: Dispatch<SetStateAction<QuizPack>>;
        selectedEntryIndex: number;
        selectEntry: (index: number) => void;
        addNewEntry: () => void;
        deleteEntry: (index: number, e?: UIEvent) => void;
        debouncedSave: (packToSave: QuizPack) => Promise<void>;
    },
) => {
    // Configure the drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // Handle the end of a drag event
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            setQuizPack((pack) => {
                const entries = pack.entries;
                const oldIndex = entries.findIndex((entry) =>
                    entry.id === active.id
                );
                const newIndex = entries.findIndex((entry) =>
                    entry.id === over.id
                );

                // Update selected entry index if it was moved
                if (selectedEntryIndex === oldIndex) {
                    selectEntry(newIndex);
                } else if (selectedEntryIndex === newIndex) {
                    selectEntry(oldIndex);
                }

                const newPack = {
                    ...pack,
                    entries: arrayMove(entries, oldIndex, newIndex),
                };
                debouncedSave(newPack);
                return newPack;
            });
        }
    };

    return (
        <div className="divide-y">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={quizPack.entries.map((entry) => entry.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="divide-y">
                        {quizPack.entries.map((entry, index) => (
                            <SortableEntry
                                key={entry.id}
                                entry={entry}
                                index={index}
                                selectedEntryIndex={selectedEntryIndex}
                                onSelect={selectEntry}
                                onDelete={() => {
                                    deleteEntry(index);
                                }}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="p-4 flex justify-center">
                <Button
                    onClick={addNewEntry}
                    variant="outline"
                    className="px-4 py-2 border rounded-md hover:bg-gray-50 flex items-center"
                >
                    <Plus className="h-4 w-4 mr-1">+</Plus>
                    곡 추가
                </Button>
            </div>
        </div>
    );
};

export default DraggableQuizEntries;
