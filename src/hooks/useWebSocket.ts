import { useState, useEffect, useRef, useCallback } from 'react';

interface Person {
  id: number;
  name: string;
  count: number;
}

interface WebSocketMessage {
  type: 'ADD_PERSON' | 'UPDATE_COUNT' | 'REMOVE_PERSON' | 'SYNC_STATE' | 'PERSON_ADDED' | 'COUNT_UPDATED' | 'PERSON_REMOVED' | 'AUTHENTICATE' | 'AUTH_SUCCESS' | 'AUTH_FAILED' | 'AUTH_STATUS_UPDATE';
  payload: unknown;
}

export function useWebSocket() {
  const [people, setPeople] = useState<Person[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedCount, setAuthenticatedCount] = useState(0);
  const [authMessage, setAuthMessage] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    
    try {
      // Docker環境とプロキシ経由でのWebSocket接続
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      
      let wsUrl: string;
      
      // nginx経由（ポート3500）の場合は/wsパスを使用
      if (window.location.port === '3500' || window.location.port === '') {
        const port = window.location.port === '' ? '' : `:${window.location.port}`;
        wsUrl = `${wsProtocol}//${wsHost}${port}/ws`;
      } else {
        // 開発環境での直接接続
        wsUrl = `${wsProtocol}//${wsHost}:8080`;
      }
      
      console.log('WebSocket接続URL:', wsUrl);
      console.log('Current location:', window.location.href);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket接続が確立されました');
        setConnectionStatus('connected');
        
        // 接続情報を取得
        fetch('/api/websocket')
          .then(res => res.json())
          .then(data => {
            setConnectedUsers(data.connectedClients);
          })
          .catch(console.error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('メッセージの解析エラー:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket接続が切断されました', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setConnectionStatus('disconnected');
        setIsAuthenticated(false);
        wsRef.current = null;
        
        // 自動再接続（頻度を制限）
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('WebSocket再接続を試行します...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocketエラー:', error);
        setConnectionStatus('disconnected');
        setIsAuthenticated(false);
      };

    } catch (error) {
      console.error('WebSocket接続エラー:', error);
      setConnectionStatus('disconnected');
    }
  }, []);

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'SYNC_STATE':
        const syncPayload = message.payload as { 
          people: Person[]; 
          authenticatedCount: number; 
          clientId: string; 
        };
        setPeople(syncPayload.people);
        setAuthenticatedCount(syncPayload.authenticatedCount);
        setClientId(syncPayload.clientId);
        break;
        
      case 'PERSON_ADDED':
        const personPayload = message.payload as Person;
        setPeople(prev => {
          const exists = prev.some(person => person.id === personPayload.id);
          if (!exists) {
            return [...prev, personPayload];
          }
          return prev;
        });
        break;

      case 'COUNT_UPDATED':
        const countPayload = message.payload as { id: number; count: number };
        const { id, count } = countPayload;
        setPeople(prev => prev.map(person =>
          person.id === id
            ? { ...person, count }
            : person
        ));
        break;

      case 'PERSON_REMOVED':
        const removePayload = message.payload as { id: number };
        setPeople(prev => prev.filter(person => person.id !== removePayload.id));
        break;

      case 'AUTH_SUCCESS':
        const successPayload = message.payload as { message: string };
        setIsAuthenticated(true);
        setAuthMessage(successPayload.message);
        setTimeout(() => setAuthMessage(''), 3000);
        break;

      case 'AUTH_FAILED':
        const failedPayload = message.payload as { message: string };
        setIsAuthenticated(false);
        setAuthMessage(failedPayload.message);
        setTimeout(() => setAuthMessage(''), 5000);
        break;

      case 'AUTH_STATUS_UPDATE':
        const statusPayload = message.payload as { authenticatedCount: number };
        setAuthenticatedCount(statusPayload.authenticatedCount);
        break;

      // 古いメッセージタイプとの互換性を保持（念のため）
      case 'ADD_PERSON':
        const oldAddPayload = message.payload as { name: string };
        const newPerson: Person = {
          id: Date.now(),
          name: oldAddPayload.name.trim(),
          count: 0
        };
        setPeople(prev => [...prev, newPerson]);
        break;

      case 'UPDATE_COUNT':
        const oldUpdatePayload = message.payload as { id: number; increment: boolean };
        const { id: updateId, increment } = oldUpdatePayload;
        setPeople(prev => prev.map(person =>
          person.id === updateId
            ? {
                ...person,
                count: increment
                  ? person.count + 1
                  : Math.max(0, person.count - 1)
              }
            : person
        ));
        break;

      case 'REMOVE_PERSON':
        const oldRemovePayload = message.payload as { id: number };
        setPeople(prev => prev.filter(person => person.id !== oldRemovePayload.id));
        break;
    }
  };

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const authenticate = useCallback((password: string) => {
    const success = sendMessage({
      type: 'AUTHENTICATE',
      payload: { password }
    });

    if (!success) {
      setAuthMessage('接続エラー: WebSocketが切断されています');
      setTimeout(() => setAuthMessage(''), 3000);
    }
  }, [sendMessage]);

  const addPerson = useCallback((name: string) => {
    const success = sendMessage({
      type: 'ADD_PERSON',
      payload: { name }
    });

    // WebSocket送信に失敗した場合のみローカル状態を更新
    if (!success) {
      const newPerson: Person = {
        id: Date.now(),
        name: name.trim(),
        count: 0
      };
      setPeople(prev => [...prev, newPerson]);
    }
  }, [sendMessage]);

  const updateCount = useCallback((id: number, increment: boolean) => {
    if (!isAuthenticated) {
      setAuthMessage('この操作には認証が必要です');
      setTimeout(() => setAuthMessage(''), 3000);
      return;
    }

    const success = sendMessage({
      type: 'UPDATE_COUNT',
      payload: { id, increment }
    });

    // WebSocket送信に失敗した場合のみローカル状態を更新
    if (!success) {
      setPeople(prev => prev.map(person =>
        person.id === id
          ? {
              ...person,
              count: increment
                ? person.count + 1
                : Math.max(0, person.count - 1)
            }
          : person
      ));
    }
  }, [sendMessage, isAuthenticated]);

  const removePerson = useCallback((id: number) => {
    if (!isAuthenticated) {
      setAuthMessage('この操作には認証が必要です');
      setTimeout(() => setAuthMessage(''), 3000);
      return;
    }

    const success = sendMessage({
      type: 'REMOVE_PERSON',
      payload: { id }
    });

    // WebSocket送信に失敗した場合のみローカル状態を更新
    if (!success) {
      setPeople(prev => prev.filter(person => person.id !== id));
    }
  }, [sendMessage, isAuthenticated]);

  useEffect(() => {
    // WebSocketサーバーを初期化
    fetch('/api/websocket')
      .then(() => {
        // サーバー初期化後に接続
        setTimeout(connect, 1000);
      })
      .catch(console.error);

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
    people,
    connectionStatus,
    connectedUsers,
    isAuthenticated,
    authenticatedCount,
    authMessage,
    clientId,
    addPerson,
    updateCount,
    removePerson,
    authenticate,
    connect
  };
} 