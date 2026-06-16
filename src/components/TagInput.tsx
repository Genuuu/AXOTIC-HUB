import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X, Plus, Terminal } from "lucide-react";

interface TagInputProps {
  value: string; // comma separated tags
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export default function TagInput({ value, onChange, placeholder = "Type tag and press Enter...", id }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  // Split and sanitize tags from the comma separated string
  const tags = value
    ? value.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const addTag = (tagText: string) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;

    // Check for duplicate (case-insensitive)
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }

    const updatedTags = [...tags, trimmed];
    onChange(updatedTags.join(", "));
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    const updatedTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(updatedTags.join(", "));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove the last tag on backspace if input is empty
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    // Support pasting multiple comma-separated concepts
    if (pasteData) {
      const splitTags = pasteData.split(/[,;\n]/);
      let currentTags = [...tags];
      splitTags.forEach((term) => {
        const trimmed = term.trim();
        if (trimmed && !currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
          currentTags.push(trimmed);
        }
      });
      onChange(currentTags.join(", "));
      setInputValue("");
    }
  };

  const defaultSuggestions = ["KiCad", "ROS2", "SLAM", "Python", "CAD / SolidWorks", "3D Printing", "Soldering", "C++", "PCB Layout", "ArduPilot"];

  return (
    <div className="space-y-2 text-left" id={id || "tag-input-container"}>
      {/* Container holding tags + input */}
      <div className="min-h-11 bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl p-2 transition-all flex flex-wrap gap-1.5 items-center">
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 text-blue-800 text-[10px] sm:text-xs font-bold pl-2.5 pr-1.5 py-0.8 rounded-lg border border-blue-100 hover:border-blue-200 transition-all shadow-2xs select-none"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="p-0.5 hover:bg-blue-200 text-blue-500 hover:text-blue-800 rounded-md transition-colors cursor-pointer"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? placeholder : "Add tag..."}
          className="flex-1 min-w-[120px] bg-transparent border-0 outline-hidden text-slate-700 placeholder-slate-400 text-xs py-1 px-1.5"
        />
      </div>

      {/* Suggested Quick Tags */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 select-none">
        <span className="font-semibold uppercase tracking-wider text-[9px] text-slate-400 flex items-center gap-1">
          <Terminal className="size-3 text-slate-300" /> Suggestions:
        </span>
        {defaultSuggestions
          .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
          .slice(0, 5)
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="bg-slate-100/70 hover:bg-slate-200/50 border border-slate-200/50 hover:border-slate-300/60 px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 text-[9px] font-semibold transition-all cursor-pointer font-sans"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}
