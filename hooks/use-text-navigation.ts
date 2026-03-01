"use client";

import { useCallback, useRef } from "react";

export function useTextNavigation() {
  const isComposingRef = useRef(false);

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const handleNavigationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, containerId: string) => {
      if (isComposingRef.current || e.nativeEvent.isComposing || e.key === "Process") return;

      const target = e.currentTarget;

      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        target.selectionStart === 0 &&
        target.selectionEnd === target.value.length
      ) {
        e.preventDefault();
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )?.set;
        setter?.call(target, "");
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }

      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

      e.preventDefault();
      const container = document.getElementById(containerId);
      if (!container) return;

      const inputs = Array.from(
        container.querySelectorAll("input, textarea")
      ) as Array<HTMLInputElement | HTMLTextAreaElement>;
      const currentIndex = inputs.indexOf(target);
      if (currentIndex === -1) return;

      if (e.key === "ArrowUp") {
        const isAtStart = target.selectionStart === 0;
        if (!isAtStart) {
          target.setSelectionRange(0, 0);
          return;
        }
      } else if (e.key === "ArrowDown") {
        const isAtEnd = target.selectionStart === target.value.length;
        if (!isAtEnd) {
          target.setSelectionRange(target.value.length, target.value.length);
          return;
        }
      }

      const targetIndex = e.key === "ArrowUp" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= inputs.length) return;

      const next = inputs[targetIndex];
      next.focus();
      requestAnimationFrame(() => {
        next.setSelectionRange(next.value.length, next.value.length);
      });
    },
    []
  );

  return {
    isComposingRef,
    onCompositionStart,
    onCompositionEnd,
    handleNavigationKeyDown,
  };
}
