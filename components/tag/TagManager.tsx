"use client";

import { useState } from "react";
import type { Area } from "@/types/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X } from "lucide-react";

const COLOR_PALETTE = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: Area[];
  onCreateArea: (name: string, color: string) => Promise<Area | null>;
  onUpdateArea: (id: string, updates: Partial<Pick<Area, "name" | "color">>) => Promise<void>;
  onDeleteArea: (id: string) => Promise<void>;
}

export function TagManager({
  open,
  onOpenChange,
  areas,
  onCreateArea,
  onUpdateArea,
  onDeleteArea,
}: TagManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const created = await onCreateArea(newName.trim(), newColor);
    if (created) {
      setNewName("");
      setNewColor(COLOR_PALETTE[0]);
    }
  };

  const handleStartEdit = (area: Area) => {
    setEditingId(area.id);
    setEditName(area.name);
    setEditColor(area.color);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await onUpdateArea(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>タグの管理</DialogTitle>
          <DialogDescription>プロジェクトで使用するタグを編集できます</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {areas.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">タグがありません</p>
            ) : (
              areas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group"
                >
                  {editingId === area.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex gap-1">
                        {COLOR_PALETTE.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            className={`w-5 h-5 rounded-full transition-transform ${
                              editColor === color
                                ? "ring-2 ring-offset-1 ring-gray-400 scale-110"
                                : "hover:scale-110"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                        <X className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="text-sm font-medium">{area.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(area)}
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onDeleteArea(area.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">新しいタグを追加</p>
            <div className="flex gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newColor === color
                      ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="タグ名を入力..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                追加
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
