"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function MemberAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(sizeClass, "rounded-full object-cover shrink-0", className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "rounded-full bg-zenshin-navy text-white flex items-center justify-center font-medium shrink-0",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
