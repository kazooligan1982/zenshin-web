import { useCallback, useRef, useState } from "react";

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  delay?: number;
  threshold?: number; // 移動許容範囲（ピクセル）
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // 開始位置を記録
      if ("touches" in e) {
        startPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else {
        startPos.current = {
          x: e.clientX,
          y: e.clientY,
        };
      }
      target.current = e.target;
      setIsPressing(true);
      setLongPressTriggered(false);

      timeout.current = setTimeout(() => {
        setLongPressTriggered(true);
        setIsPressing(false);
        onLongPress(e);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (e: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      // 移動距離をチェック
      let moved = false;
      if (startPos.current) {
        if ("touches" in e && e.changedTouches[0]) {
          const dx = Math.abs(e.changedTouches[0].clientX - startPos.current.x);
          const dy = Math.abs(e.changedTouches[0].clientY - startPos.current.y);
          moved = dx > threshold || dy > threshold;
        } else if ("clientX" in e) {
          const dx = Math.abs(e.clientX - startPos.current.x);
          const dy = Math.abs(e.clientY - startPos.current.y);
          moved = dx > threshold || dy > threshold;
        }
      }

      setIsPressing(false);

      if (shouldTriggerClick && !longPressTriggered && !moved && onClick) {
        onClick(e);
      }

      setLongPressTriggered(false);
      startPos.current = null;
    },
    [onClick, longPressTriggered, threshold]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchCancel: (e: React.TouchEvent) => clear(e, false),
    isPressing,
  };
}

