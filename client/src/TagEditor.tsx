import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizPack } from "./types";
import { fetchTags } from "./lib/api";

interface TagEditorProps {
  quizPack: QuizPack;
  onChange: (updatedPack: QuizPack) => void;
}

export default function TagEditor({ quizPack, onChange }: TagEditorProps) {
  const [newTagInput, setNewTagInput] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  const tags = quizPack.tags || [];

  // Fetch all available tags on component mount
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true);
      try {
        const tagData = await fetchTags();
        setAllTags(tagData);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTags();
  }, []);

  // Filter suggestions based on input
  const filteredSuggestions = newTagInput.length > 0
    ? allTags
      .filter((tag) =>
        tag.toLowerCase().includes(newTagInput.toLowerCase()) &&
        !tags.includes(tag)
      )
      .sort((a, b) => {
        // Prioritize tags that start with the input
        const aStartsWithInput = a.toLowerCase().startsWith(
          newTagInput.toLowerCase(),
        );
        const bStartsWithInput = b.toLowerCase().startsWith(
          newTagInput.toLowerCase(),
        );

        if (aStartsWithInput && !bStartsWithInput) return -1;
        if (!aStartsWithInput && bStartsWithInput) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 5) // Limit to 5 suggestions
    : [];

  const addTag = (tagToAdd: string = newTagInput) => {
    if (!tagToAdd.trim()) return;

    const newTag = tagToAdd.trim();
    if (!tags.includes(newTag)) {
      const updatedTags = [...tags, newTag];
      onChange({
        ...quizPack,
        tags: updatedTags,
        updatedAt: new Date(),
      });
    }
    setNewTagInput("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    onChange({
      ...quizPack,
      tags: updatedTags,
      updatedAt: new Date(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (
        selectedSuggestionIndex >= 0 &&
        selectedSuggestionIndex < filteredSuggestions.length
      ) {
        // If a suggestion is selected, use that
        addTag(filteredSuggestions[selectedSuggestionIndex]);
      } else {
        // Otherwise use the input value
        addTag();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Ensure selected suggestion is visible in the dropdown
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionBoxRef.current) {
      const selectedElement = suggestionBoxRef.current
        .children[selectedSuggestionIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedSuggestionIndex]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">
        태그
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.length > 0
          ? (
            tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 cursor-default"
              >
                {tag}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )
          : (
            <div className="text-sm text-gray-500">
              아직 태그가 없습니다
            </div>
          )}
      </div>
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            placeholder="새 태그 추가"
            className="w-full"
            value={newTagInput}
            onChange={(e) => {
              setNewTagInput(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
              setSelectedSuggestionIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onFocus={() => {
              if (newTagInput.length > 0) {
                setShowSuggestions(true);
              }
            }}
          />

          {/* Tag suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionBoxRef}
              className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion}
                  className={`px-3 py-2 cursor-pointer text-sm ${
                    index === selectedSuggestionIndex
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => addTag(suggestion)}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span>{suggestion}</span>
                    {index === selectedSuggestionIndex && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin">
              </div>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => addTag()}
        >
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </div>
    </div>
  );
}
