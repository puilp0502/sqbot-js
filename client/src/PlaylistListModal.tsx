import { useState } from "react";
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

// Mock data for playlists
const mockPlaylists = [
    {
        id: "kpop-hits-2023",
        name: "K-Pop Hits 2023",
        description: "The biggest K-Pop songs from 2023",
        createdAt: "2023-12-15T12:00:00Z",
        updatedAt: "2024-04-10T15:30:00Z",
        creator: "music_lover",
        songCount: 25,
        tags: ["k-pop", "2023", "hits"],
    },
    {
        id: "anime-openings",
        name: "Anime Openings Collection",
        description: "Popular anime opening themes from various series",
        createdAt: "2023-10-05T09:15:00Z",
        updatedAt: "2024-03-22T11:45:00Z",
        creator: "anime_fan",
        songCount: 42,
        tags: ["anime", "openings", "japanese"],
    },
    {
        id: "vtuber-hits",
        name: "VTuber Hits!",
        description: "Popular songs from VTubers across platforms",
        createdAt: "2023-11-20T14:30:00Z",
        updatedAt: "2024-04-15T10:20:00Z",
        creator: "vtuber_enthusiast",
        songCount: 18,
        tags: ["vtuber", "covers", "originals"],
    },
    {
        id: "bocchi-the-rock",
        name: "봇치 더 락! OST 전곡",
        description: "Complete soundtrack from Bocchi the Rock!",
        createdAt: "2023-09-12T16:45:00Z",
        updatedAt: "2024-02-28T09:10:00Z",
        creator: "bocchi_fan",
        songCount: 12,
        tags: ["anime", "bocchi", "soundtrack"],
    },
    {
        id: "classic-rock-anthems",
        name: "Classic Rock Anthems",
        description: "Timeless rock classics from the 70s and 80s",
        createdAt: "2023-08-30T11:20:00Z",
        updatedAt: "2024-01-15T13:50:00Z",
        creator: "rock_legend",
        songCount: 30,
        tags: ["rock", "classic", "70s", "80s"],
    },
    {
        id: "jpop-2010s",
        name: "J-Pop Hits of the 2010s",
        description: "The most popular Japanese pop songs from the last decade",
        createdAt: "2023-07-18T10:05:00Z",
        updatedAt: "2024-03-05T16:30:00Z",
        creator: "jpop_lover",
        songCount: 35,
        tags: ["j-pop", "2010s", "japanese"],
    },
    {
        id: "kpop-girl-groups",
        name: "K-Pop Girl Groups",
        description: "Hit songs from popular K-Pop girl groups",
        createdAt: "2023-06-25T13:40:00Z",
        updatedAt: "2024-04-02T14:15:00Z",
        creator: "kpop_stan",
        songCount: 28,
        tags: ["k-pop", "girl groups"],
    },
    {
        id: "video-game-osts",
        name: "Video Game Soundtracks",
        description: "Memorable themes from popular video games",
        createdAt: "2023-05-10T15:25:00Z",
        updatedAt: "2024-02-10T11:30:00Z",
        creator: "gamer_music",
        songCount: 40,
        tags: ["video games", "soundtrack", "ost"],
    },
];

// Format date to a more readable format
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

    // Extract all unique tags from playlists
    const allTags = Array.from(
        new Set(mockPlaylists.flatMap((playlist) => playlist.tags)),
    ).sort();

    // Filter playlists based on search query and selected tags
    const filteredPlaylists = mockPlaylists.filter((playlist) => {
        const matchesSearch = searchQuery === "" ||
            playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            playlist.description.toLowerCase().includes(
                searchQuery.toLowerCase(),
            ) ||
            playlist.creator.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTags = selectedTags.length === 0 ||
            selectedTags.every((tag) => playlist.tags.includes(tag));

        return matchesSearch && matchesTags;
    });

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
                                placeholder="Search playlists by name, description, or creator..."
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

                    {/* Results count */}
                    <div className="text-sm text-gray-500 pb-2">
                        {filteredPlaylists.length}{" "}
                        {filteredPlaylists.length === 1
                            ? "playlist"
                            : "playlists"} found
                    </div>

                    {/* Playlist list */}
                    <div className="overflow-y-auto flex-1 -mx-6 px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredPlaylists.length > 0
                                ? (
                                    filteredPlaylists.map((playlist) => (
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
                                                    {playlist.tags.map((
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
                                                            {playlist.songCount}
                                                            {" "}
                                                            songs
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-3.5 w-3.5" />
                                                        <span>
                                                            {playlist.creator}
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
                                                    <div className="flex items-center gap-1">
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
