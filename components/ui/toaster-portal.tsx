"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "@/components/ui/sonner";

const emptySubscribe = () => () => {};

export function ToasterPortal() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return null;
  }

  return createPortal(<Toaster />, document.body);
}
