import { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  const connect = useCallback(() => {
    // Determine WebSocket protocol based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Get host (includes hostname and port, e.g., 'localhost:5000' or 'example.com')
    const host = window.location.host;
    // Construct WebSocket URL pointing to /ws endpoint
    const wsUrl = `${protocol}://${host}/ws`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        setLastMessage(event);

        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'unit_update') {
            // Invalidate units query to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['/api/units'] });

            // Show visual feedback
            const unitId = message.data?.id;
            if (unitId) {
              const element = document.querySelector(`[data-testid="card-unit-${unitId}"]`);
              if (element) {
                element.classList.add('animate-pulse');
                setTimeout(() => {
                  element.classList.remove('animate-pulse');
                }, 1000);
              }
            }
          } else if (message.type === 'lead_update') {
            // Invalidate leads query to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['/api/leads'] });

            // Show visual feedback
            const leadId = message.data?.id;
            if (leadId) {
              const element = document.querySelector(`[data-testid="card-lead-${leadId}"]`);
              if (element) {
                element.classList.add('animate-pulse');
                setTimeout(() => {
                  element.classList.remove('animate-pulse');
                }, 1000);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    lastMessage,
    sendMessage,
    readyState: wsRef.current?.readyState ?? WebSocket.CLOSED
  };
}