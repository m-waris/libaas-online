"use client";

import { useEffect, useRef } from "react";
import { useToast, type ToastKind } from "./toast-provider";

export function ToastNotice({
  message,
  kind,
}: {
  message?: string;
  kind: ToastKind;
}) {
  const { notify } = useToast();
  const lastNotice = useRef<string | null>(null);

  useEffect(() => {
    if (!message) {
      lastNotice.current = null;
      return;
    }
    const noticeKey = `${kind}:${message}`;
    if (lastNotice.current === noticeKey) return;
    lastNotice.current = noticeKey;
    notify(message, kind);
  }, [kind, message, notify]);

  return null;
}
