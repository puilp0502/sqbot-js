import {
    forwardRef,
    MouseEvent,
    ReactNode,
    useCallback,
    useEffect,
    useImperativeHandle,
    useState,
} from "react";
import { Button } from "./components/ui/button";
import { Check, Loader2, Save, X } from "lucide-react";

interface SaveButtonProps {
    onSave?: () => Promise<any>;
    onSaveStart?: () => void;
    successDuration?: number;
    minLoadingDuration?: number;
    autoReset?: boolean;
    children?: React.ReactNode;
    [key: string]: any; // For additional button props
}

export interface SaveButtonRef {
    startSave: () => Promise<any>;
    setSuccess: (result?: any) => void;
    setError: (error?: any) => void;
    reset: () => void;
    getStatus: () => string;
    setMinLoadingDuration: (duration: number) => void;
}

type SaveButtonStatus = "idle" | "saving" | "success" | "error";

// SaveButton Component with encapsulated logic and ref API
export const SaveButton = forwardRef<SaveButtonRef, SaveButtonProps>(({
    onSave,
    onSaveStart,
    successDuration = 1000,
    minLoadingDuration = 250, // Minimum time to show loading state
    autoReset = true,
    children = "Save",
    ...buttonProps
}, ref) => {
    const [status, setStatus] = useState<SaveButtonStatus>("idle");
    const [loadingMinDuration, setLoadingMinDuration] = useState<number>(
        minLoadingDuration,
    );

    // Update min loading duration when prop changes
    useEffect(() => {
        setLoadingMinDuration(minLoadingDuration);
    }, [minLoadingDuration]);

    // Reset function
    const resetToIdle = useCallback((): void => {
        setStatus("idle");
    }, []);

    // Handle save success
    const handleSuccess = useCallback((result?: any): void => {
        setStatus("success");

        if (autoReset) {
            setTimeout(() => {
                resetToIdle();
            }, successDuration);
        }
    }, [autoReset, successDuration, resetToIdle]);

    // Handle save error
    const handleError = useCallback((error?: any): void => {
        setStatus("error");

        if (autoReset) {
            setTimeout(() => {
                resetToIdle();
            }, successDuration);
        }
    }, [autoReset, successDuration, resetToIdle]);

    // Start save operation
    const startSave = useCallback((): void => {
        if (status === "saving") return;
        setStatus("saving");
        if (onSaveStart) onSaveStart();
    }, [status, onSaveStart]);

    // Execute save operation
    const executeSave = useCallback(async (): Promise<any> => {
        // Record start time to ensure minimum loading duration
        const startTime = Date.now();

        try {
            let result;
            // Execute the actual save operation
            result = await Promise.resolve(onSave());

            // Calculate elapsed time since loading started
            const elapsedTime = Date.now() - startTime;

            // If operation was too fast, wait additional time to meet minimum duration
            if (elapsedTime < loadingMinDuration) {
                await new Promise((resolve) =>
                    setTimeout(resolve, loadingMinDuration - elapsedTime)
                );
            }

            // Now transition to success state
            handleSuccess(result);
            return result;
        } catch (error) {
            console.log("error encounterd");
            // For errors, also ensure minimum loading time
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < loadingMinDuration) {
                await new Promise((resolve) =>
                    setTimeout(resolve, loadingMinDuration - elapsedTime)
                );
            }

            handleError(error);
            throw error;
        }
    }, [onSave, handleSuccess, handleError, loadingMinDuration]);

    // Handle button click
    const handleClick = useCallback(
        async (e: React.MouseEvent): Promise<any> => {
            startSave();
            return executeSave();
        },
        [startSave, executeSave],
    );

    // Set min loading duration
    const setMinLoadingDuration = useCallback((duration: number): void => {
        setLoadingMinDuration(duration);
    }, []);

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
        // Start the save animation (for external triggers like Ctrl+S)
        startSave: () => {
            startSave();
            return executeSave();
        },
        // Force success state
        setSuccess: (result?: any) => {
            handleSuccess(result);
        },
        // Force error state
        setError: (error?: any) => {
            handleError(error);
        },
        // Reset to idle state
        reset: () => {
            resetToIdle();
        },
        // Get current status
        getStatus: () => status,
        // Set min loading duration
        setMinLoadingDuration: (duration: number) => {
            setMinLoadingDuration(duration);
        },
    }), [
        startSave,
        executeSave,
        handleSuccess,
        handleError,
        resetToIdle,
        status,
        setMinLoadingDuration,
    ]);

    return (
        <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 cursor-pointer"
            onClick={handleClick}
            disabled={status === "saving" && buttonProps.disabled !== false}
            {...buttonProps}
        >
            <div className="relative flex items-center justify-center h-4 w-4">
                {/* Save Icon */}
                <div
                    className={`absolute transition-all duration-300 ${
                        status === "idle"
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-0"
                    }`}
                >
                    <Save className="h-4 w-4" />
                </div>

                {/* Spinner */}
                <div
                    className={`absolute transition-all duration-300 ${
                        status === "saving"
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-0"
                    }`}
                >
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>

                {/* Checkmark */}
                <div
                    className={`absolute transition-all duration-300 ${
                        status === "success"
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-0"
                    }`}
                >
                    <Check className="h-4 w-4 text-green-500" />
                </div>

                {/* Error X */}
                <div
                    className={`absolute transition-all duration-300 ${
                        status === "error"
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-0"
                    }`}
                >
                    <X className="h-4 w-4 text-red-500" />
                </div>
            </div>
            <span>{children}</span>
        </Button>
    );
});

SaveButton.displayName = "SaveButton";
