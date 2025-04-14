import { Clock } from "lucide-react";
import { QuizEntry } from "./types";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { useEffect, useRef } from "react";
import { Checkbox } from "./components/ui/checkbox";

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const parseTime = (timeStr: string) => {
    const calculated = (() => {
        if (!timeStr.includes(":")) return parseInt(timeStr); // treat it as raw seconds
        const [mins, secs] = timeStr.split(":").map((num) => parseInt(num, 10));
        if (secs >= 60 || mins >= 60) return NaN;
        return mins * 60 + secs;
    })();
    if (calculated < 0) return NaN;
    return calculated;
};

export const TimeRangeInput = ({
    entry,
    onTimeRangeChange,
}: {
    entry: QuizEntry;
    onTimeRangeChange: (start: number, duration: number) => void;
}) => {
    const songStartRef = useRef<HTMLInputElement>(null);
    const songEndRef = useRef<HTMLInputElement>(null);
    const songPlaysUntilEnd = entry.playDuration === -1;

    const updateRenderedValueFromEntry = () => {
        if (songStartRef.current === null || songEndRef.current === null) {
            return;
        }
        songStartRef.current.value = formatTime(entry.songStart);
        if (!songPlaysUntilEnd) {
            songEndRef.current.value = formatTime(
                entry.songStart + entry.playDuration,
            );
        } else {
            songEndRef.current.value = "-";
        }
    };
    useEffect(() => {
        updateRenderedValueFromEntry();
    }, [entry.songStart, entry.playDuration]);

    const handleInputDefocus = () => {
        if (songStartRef.current === null || songEndRef.current === null) {
            return;
        }
        const [songStart, playDuration] = (() => {
            const parsedStart = parseTime(songStartRef.current.value);
            let calculatedDuration: number;
            if (songPlaysUntilEnd) {
                calculatedDuration = -1;
            } else {
                const parsedEnd = parseTime(songEndRef.current.value);
                calculatedDuration = parsedEnd - parsedStart;
            }
            return [parsedStart, calculatedDuration];
        })();
        if (isNaN(songStart) || isNaN(playDuration)) { // invalid input; roll back to original state
            updateRenderedValueFromEntry();
            return;
        } else {
            updateRenderedValueFromEntry(); // update rendered values in case the values don't change, and useEffect don't trigger
            onTimeRangeChange(songStart, playDuration);
        }
    };

    const handlePlayUntilEndChange = (checked: boolean) => {
        if (checked) {  // unchecked -> checked
            onTimeRangeChange(entry.songStart, -1);
        } else {
            onTimeRangeChange(entry.songStart, 60);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <h3 className="text-sm font-medium">
                    재생 설정
                </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="block text-sm">
                        재생 시작
                    </Label>
                    <Input ref={songStartRef} onBlur={handleInputDefocus} />
                </div>
                <div>
                    <Label className="block text-sm mb-1">
                        재생 종료
                    </Label>
                    <div className="space-y-2">
                        <Input
                            ref={songEndRef}
                            disabled={entry.playDuration === -1}
                            onBlur={handleInputDefocus}
                        />
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="plays-until-end"
                                checked={entry.playDuration === -1}
                                onCheckedChange={(state) => {
                                    handlePlayUntilEndChange(state as boolean);
                                }}
                            />
                            <Label
                                className="block text-sm text-gray-700"
                                htmlFor="plays-until-end"
                            >
                                곡 끝까지 재생
                            </Label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
