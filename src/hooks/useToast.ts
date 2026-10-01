// トースト通知（role=status の一文表示・3.6秒で自動消去）。
"use client";

import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState("");

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 3600);
  }, []);

  return { toast, showToast };
}
