import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  Calendar,
  Clock,
  Headphones,
  Music,
  Play,
  Plus,
  Search,
  TrendingUp,
  User,
} from "lucide-react";
import PlaylistListModal from "./PlaylistListModal";
import { QuizPack } from "./types";
import { createQuizPack, searchQuizPacks } from "./lib/api";
import { cn } from "./lib/utils";

// Format date to a more readable format
const formatDate = (dateString: Date | string) => {
  const date = typeof dateString === "string"
    ? new Date(dateString)
    : dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format number with commas
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function HomePage() {
  const navigate = useNavigate();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const [featuredPlaylists, setFeaturedPlaylists] = useState<QuizPack[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<QuizPack[]>([]);
  const [popularPlaylists, setPopularPlaylists] = useState<QuizPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      setIsLoading(true);
      try {
        // For featured playlists, we'll use a specific tag (can be adjusted based on your needs)
        const featuredResults = await searchQuizPacks("", ["Featured"]);
        setFeaturedPlaylists(featuredResults.quizPacks.slice(0, 3));

        // For recent playlists, sort by updated date
        const recentResults = await searchQuizPacks("", undefined, "updatedAt");
        setRecentPlaylists(recentResults.quizPacks.slice(0, 3));

        // For popular playlists, we could sort by playCount if API supports it
        // Since our mock used popularity, we'll simulate that with another search
        const popularResults = await searchQuizPacks(
          "",
          undefined,
          "playCount",
        );
        setPopularPlaylists(popularResults.quizPacks.slice(0, 3));

        setError(null);
      } catch (err) {
        console.error("Error fetching playlists:", err);
        setError("Failed to load playlists data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  // Handle playlist selection
  const handleSelectPlaylist = (playlistId: string) => {
    navigate(`/editor/${playlistId}`);
  };

  // Handle creating a new playlist
  const handleCreateNew = async () => {
    try {
      // Show loading toast
      const loadingId = toast.loading("Creating new quiz pack...");

      // Create a new empty quiz pack
      const newPack = await createQuizPack({
        name: "New Quiz Pack",
        description: "",
        tags: [],
      });

      // Dismiss loading toast and show success
      toast.dismiss(loadingId);
      toast.success("Quiz pack created successfully!");

      // Navigate to the editor with the new pack ID
      navigate(`/editor/${newPack.id}`);
    } catch (error) {
      console.error("Error creating quiz pack:", error);
      toast.error("Failed to create quiz pack");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <h1 className="text-2xl font-bold text-red-500">SQBot Editor</h1>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setIsPlaylistModalOpen(true)}
            >
              <Search className="w-4 h-4" />
              <span>Browse</span>
            </Button>

            <Button
              className="flex items-center gap-2"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container px-4 mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            추억의 <span className="text-red-500">노래 맞추기</span>{" "}
            게임을 Discord에서
          </h1>
          <p className="max-w-2xl mx-auto mt-6 text-xl text-gray-600">
            예전 친구들과 즐기던 노래 맞추기 게임을 이제 Discord에서 즐기세요.
            {" "}
            <br />
            SQBot을 사용해 플레이리스트 생성, 관리 및 플레이를 할 수 있습니다.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <Button
              size="lg"
              className="text-lg py-6"
              onClick={handleCreateNew}
            >
              <Plus className="w-5 h-5 mr-2" />
              새 플레이리스트 만들기
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg py-6"
              onClick={() => setIsPlaylistModalOpen(true)}
            >
              <Search className="w-5 h-5 mr-2" />
              플레이리스트 찾아보기
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Playlists */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              오늘의 플레이리스트
            </h2>
            <Button
              variant="ghost"
              className="flex items-center gap-1 text-gray-600"
              onClick={() => setIsPlaylistModalOpen(true)}
            >
              모든 플레이리스트 보기
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {isLoading
            ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mx-auto">
                </div>
                <p className="mt-2 text-gray-500">
                  플레이리스트를 불러오고 있습니다...
                </p>
              </div>
            )
            : error
            ? (
              <div className="text-center py-12">
                <p className="text-red-500">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  다시 시도
                </Button>
              </div>
            )
            : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredPlaylists.length > 0
                  ? (
                    featuredPlaylists.map((playlist) => (
                      <Card
                        key={playlist.id}
                        className="overflow-hidden transition-all hover:shadow-md"
                      >
                        <div className="relative aspect-video">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <img
                            src="/placeholder.svg?height=400&width=600"
                            alt={playlist.name}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                            <h3 className="text-xl font-bold line-clamp-1">
                              {playlist.name}
                            </h3>
                            <p className="text-sm text-white/80 line-clamp-1">
                              {playlist.description}
                            </p>
                          </div>
                          <Button
                            className="absolute top-3 right-3 w-10 h-10 rounded-full p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                            onClick={() => handleSelectPlaylist(playlist.id)}
                          >
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {playlist.tags.map((tag) => (
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
                              <span>{playlist.entries.length} songs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                Updated: {formatDate(playlist.updatedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Headphones className="h-3.5 w-3.5" />
                              <span>
                                {formatNumber(playlist.playCount || 0)} plays
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="p-0">
                          <Button
                            variant="ghost"
                            className="w-full rounded-none h-12 text-blue-600"
                            onClick={() => handleSelectPlaylist(playlist.id)}
                          >
                            Open in Editor
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )
                  : (
                    <div className="col-span-3 text-center py-12">
                      <Music className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500">
                        오늘의 플레이리스트 아직 없음
                      </p>
                    </div>
                  )}
              </div>
            )}
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-12 bg-white">
        <div className="container px-4 mx-auto">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            플레이리스트 찾아보기
          </h2>

          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="recent" className="text-sm">
                <Clock className="w-4 h-4 mr-2" />
                최근 업데이트
              </TabsTrigger>
              <TabsTrigger value="popular" className="text-sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                인기 플레이리스트
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="mt-0">
              {isLoading
                ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mx-auto">
                    </div>
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {recentPlaylists.length > 0
                      ? (
                        recentPlaylists.map((playlist) => (
                          <Card
                            key={playlist.id}
                            className="overflow-hidden transition-all hover:shadow-md"
                          >
                            <div className="p-4 border-b">
                              <h3 className="font-bold line-clamp-1">
                                {playlist.name}
                              </h3>
                              <p
                                className={cn(
                                  "text-sm text-gray-600 line-clamp-2",
                                  !playlist.description && "text-gray-400",
                                )}
                              >
                                {playlist.description || "No description"}
                              </p>
                            </div>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Music className="h-3.5 w-3.5" />
                                  <span>{playlist.entries.length} songs</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    Updated: {formatDate(playlist.updatedAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Headphones className="h-3.5 w-3.5" />
                                  <span>
                                    {formatNumber(playlist.playCount || 0)}{" "}
                                    plays
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="p-0">
                              <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-blue-600"
                                onClick={() =>
                                  handleSelectPlaylist(playlist.id)}
                              >
                                Open in Editor
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </CardFooter>
                          </Card>
                        ))
                      )
                      : (
                        <div className="col-span-3 text-center py-8">
                          <p className="text-gray-500">
                            No recent playlists found
                          </p>
                        </div>
                      )}
                  </div>
                )}
            </TabsContent>

            <TabsContent value="popular" className="mt-0">
              {isLoading
                ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mx-auto">
                    </div>
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {popularPlaylists.length > 0
                      ? (
                        popularPlaylists.map((playlist) => (
                          <Card
                            key={playlist.id}
                            className="overflow-hidden transition-all hover:shadow-md"
                          >
                            <div className="p-4 border-b">
                              <h3 className="font-bold line-clamp-1">
                                {playlist.name}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {playlist.description}
                              </p>
                            </div>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Music className="h-3.5 w-3.5" />
                                  <span>{playlist.entries.length} songs</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    Updated: {formatDate(playlist.updatedAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Headphones className="h-3.5 w-3.5" />
                                  <span>
                                    {formatNumber(playlist.playCount || 0)}{" "}
                                    plays
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="p-0">
                              <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-blue-600"
                                onClick={() =>
                                  handleSelectPlaylist(playlist.id)}
                              >
                                Open in Editor
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </CardFooter>
                          </Card>
                        ))
                      )
                      : (
                        <div className="col-span-3 text-center py-8">
                          <p className="text-gray-500">
                            No popular playlists found
                          </p>
                        </div>
                      )}
                  </div>
                )}
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsPlaylistModalOpen(true)}
            >
              <Search className="w-5 h-5 mr-2" />
              모든 플레이리스트 보기
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <h2 className="mb-12 text-3xl font-bold tracking-tight text-center">
            SQBot 동작 방식
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-red-500 rounded-full">
                <Music className="w-6 h-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">1. 노래 추가하기</h3>
              <p className="text-gray-600">
                SQBot Editor를 사용해 플레이리스트에 노래를 추가해 보세요.{" "}
                <br />
                YouTube에서 바로 노래를 추가할 수 있어요.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-red-500 rounded-full">
                <Play className="w-6 h-6 ml-0.5" />
              </div>
              <h3 className="mb-2 text-xl font-bold">2. 문제 구성하기</h3>
              <p className="text-gray-600">
                각 문제별로 재생 구간, 정답, 복수 정답을 설정합니다. <br />
                친구들을 괴롭히고 싶나요? 복수 정답을 하나도 추가하지 마세요!
                <br />
                <span className="text-sm text-gray-500 mt-1">
                  거지같은 문제로 발생하는 모든 문제에 대해 SQBot은 책임지지
                  않습니다.
                </span>
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center w-12 h-12 mb-4 text-white bg-red-500 rounded-full">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">3. Discord에서 플레이</h3>
              <p className="text-gray-600">
                SQBot Discord 봇을 사용해 플레이리스트를 플레이해 보세요. <br />
                노래 맞추기 게임을 즐겨보세요!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t">
        <div className="container px-4 mx-auto text-center text-gray-500">
          <p>
            © 2025 Frank Yang. All songs are property of their respective
            owners.
          </p>
        </div>
      </footer>

      {/* Playlist List Modal */}
      <PlaylistListModal
        open={isPlaylistModalOpen}
        onOpenChange={setIsPlaylistModalOpen}
        onSelectPlaylist={handleSelectPlaylist}
      />
    </div>
  );
}
