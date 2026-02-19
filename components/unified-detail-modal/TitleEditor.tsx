"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface TitleEditorProps {
  title: string;
  onSave: (newTitle: string) => void;
  placeholder?: string;
}

export function TitleEditor({ title, onSave, placeholder }: TitleEditorProps) {
  const t = useTranslations("modal");
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing, value]);

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        className="text-xl font-semibold leading-snug w-full bg-transparent border-none outline-none resize-none overflow-hidden py-1"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave(value.trim());
            setIsEditing(false);
          }
          if (e.key === "Escape") {
            setValue(title);
            setIsEditing(false);
          }
        }}
        onBlur={() => {
          onSave(value.trim());
          setIsEditing(false);
        }}
        autoFocus
        rows={1}
      />
    );
  }

  return (
    <h2
      className="text-xl font-semibold leading-snug cursor-pointer hover:bg-muted/10 rounded px-1 -mx-1 py-1"
      onClick={() => setIsEditing(true)}
    >
      {title?.trim() || placeholder || t("untitled")}
    </h2>
  );
}
