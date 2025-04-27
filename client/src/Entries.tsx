import {
    Dispatch,
    SetStateAction,
    UIEvent,
    useEffect,
    useRef,
    useState,
} from "react";
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
    const scrollIntoViewRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (index === selectedEntryIndex) {
            let current = scrollIntoViewRef.current;
            if (current === null) {
                return;
            }
            if ("scrollIntoViewIfNeeded" in current) {
                (current as any).scrollIntoViewIfNeeded(true);
            } else {
                current.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedEntryIndex]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-4 flex items-center cursor-pointer relative group ${
                index === selectedEntryIndex
                    ? "bg-gray-100"
                    : "hover:bg-gray-50"
            }`}
            onClick={() => onSelect(index)}
        >
            <div className="flex items-center flex-1" ref={scrollIntoViewRef}>
                <div
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4 mr-2 text-gray-400 cursor-grab" />
                </div>
                <div className="mr-4 font-bold">{index + 1}</div>
                <div className="flex-1">
                    <div className="font-medium truncate">
                        {entry.performer} - {entry.canonicalName}
                    </div>
                    <div className="text-xs text-blue-500 truncate">
                        {entry.ytVideoId
                            ? `https://youtu.be/${entry.ytVideoId}?t=${entry.songStart}`
                            : ""}
                    </div>
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 hover:text-red-500"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(index, e);
                }}
            >
                <Trash className="h-4 w-4" />
            </Button>
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
        <div className="divide-y border-t">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={quizPack.entries.map((entry) => entry.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="divide-y max-h-[calc(100vh-16rem)] overflow-y-auto">
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
