import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Music, Plus, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuizPack } from "./types";
import { useDebounceValue } from "@/lib/hooks";
import { useFetcher } from "react-router-dom";
import { SearchResults, fetchTags, searchQuizPacks } from "./lib/api";

// Format date to a more readable format
const formatDate = (dateString: Date | string) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

interface PlaylistListModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectPlaylist: (playlistId: string) => void;
}

export default function PlaylistListModal(
    { open, onOpenChange, onSelectPlaylist }: PlaylistListModalProps,
) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [playlists, setPlaylists] = useState<QuizPack[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Use React Router's useFetcher for data fetching
    const tagsFetcher = useFetcher();
    const playlistsFetcher = useFetcher();
    
    // Use debounced value for search to reduce API calls
    const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

    // Fetch data using fetchers
    const fetchData = useCallback(async () => {
        if (!open) return;
        
        setIsLoading(true);
        
        try {
            // Fetch tags
            const tags = await fetchTags();
            setAllTags(tags.sort());
            
            // Fetch playlists
            const searchResults = await searchQuizPacks(
                debouncedSearchQuery, 
                selectedTags.length > 0 ? selectedTags : undefined
            );
            setPlaylists(searchResults.quizPacks);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [open, debouncedSearchQuery, selectedTags]);

    // Toggle tag selection
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery("");
        setSelectedTags([]);
    };
    
    // Fetch data when modal opens or filters change
    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, fetchData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        Browse Quiz Packs
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col h-full overflow-hidden">
                    {/* Search and filters */}
                    <div className="space-y-4 pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search playlists by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    Filter by tags:
                                </h3>
                                {(searchQuery || selectedTags.length > 0) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-7 text-xs text-gray-500"
                                    >
                                        Clear filters
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {allTags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant={selectedTags.includes(tag)
                                            ? "default"
                                            : "outline"}
                                        className={`cursor-pointer ${
                                            selectedTags.includes(tag)
                                                ? "bg-blue-500 hover:bg-blue-600"
                                                : "hover:bg-gray-100"
                                        }`}
                                        onClick={() => toggleTag(tag)}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="text-center py-4">
                            <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mx-auto">
                            </div>
                            <p className="mt-2 text-sm text-gray-500">Loading quiz packs...</p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && !isLoading && (
                        <div className="text-center py-4">
                            <p className="text-red-500">{error}</p>
                        </div>
                    )}

                    {/* Results count */}
                    {!isLoading && !error && (
                        <div className="text-sm text-gray-500 pb-2">
                            {playlists.length}{" "}
                            {playlists.length === 1
                                ? "playlist"
                                : "playlists"} found
                        </div>
                    )}

                    {/* Playlist list */}
                    {!isLoading && !error && (
                        <div className="overflow-y-auto flex-1 -mx-6 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {playlists.length > 0
                                    ? (
                                        playlists.map((playlist) => (
                                            <div
                                                key={playlist.id}
                                                className="border rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                                onClick={() =>
                                                    onSelectPlaylist(playlist.id)}
                                            >
                                                <div className="p-4 space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <h3 className="font-medium text-lg line-clamp-1">
                                                            {playlist.name}
                                                        </h3>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectPlaylist(
                                                                    playlist.id,
                                                                );
                                                            }}
                                                        >
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {playlist.description}
                                                    </p>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {playlist.tags?.map((
                                                            tag,
                                                        ) => (
                                                            <Badge
                                                                key={tag}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Music className="h-3.5 w-3.5" />
                                                            <span>
                                                                {playlist.entries?.length || 0}
                                                                {" "}
                                                                songs
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>
                                                                Created:{" "}
                                                                {formatDate(
                                                                    playlist
                                                                        .createdAt,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 col-span-2">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>
                                                                Updated:{" "}
                                                                {formatDate(
                                                                    playlist
                                                                        .updatedAt,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )
                                    : (
                                        <div className="col-span-2 py-12 text-center text-gray-500">
                                            <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                            <p className="text-lg font-medium">
                                                No playlists found
                                            </p>
                                            <p className="text-sm">
                                                Try adjusting your search or filters
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    )}

                    {/* Create new playlist button */}
                    <div className="pt-4 mt-4 border-t">
                        <Button
                            className="w-full"
                            onClick={() => onOpenChange(false)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Quiz Pack
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
