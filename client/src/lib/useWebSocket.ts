import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "./queryClient";

type WSMessage = {
  showId: string;
  type: string;
  data: unknown;
};

export function useWebSocket(showId?: string) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!showId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.showId && msg.showId === showId) {
          // Invalidate relevant queries on real-time updates
          if (msg.type.startsWith("ring:")) {
            queryClient.invalidateQueries({ queryKey: ["/api/shows", showId, "rings"] });
            if (msg.type === "ring:updated" && msg.data && typeof msg.data === "object" && "id" in msg.data) {
              queryClient.invalidateQueries({ queryKey: ["/api/rings", (msg.data as { id: string }).id] });
            }
          }
          if (msg.type === "activity:created") {
            queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().includes("/activities") ?? false });
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [showId]);

  return wsRef;
}
