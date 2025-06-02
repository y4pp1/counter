import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Person {
  id: number;
  name: string;
  count: number;
}

interface AuthenticatedClient {
  ws: WebSocket;
  isAuthenticated: boolean;
  clientId: string;
}

interface WebSocketMessage {
  type: 'ADD_PERSON' | 'UPDATE_COUNT' | 'REMOVE_PERSON' | 'SYNC_STATE' | 'PERSON_ADDED' | 'COUNT_UPDATED' | 'PERSON_REMOVED' | 'AUTHENTICATE' | 'AUTH_SUCCESS' | 'AUTH_FAILED' | 'AUTH_STATUS_UPDATE';
  payload: any;
}

// 管理者パスワード（本来は環境変数で管理）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const WS_PORT = parseInt(process.env.WS_PORT || '8080');

// In-memory storage
let people: Person[] = [];
let authenticatedClients = new Map<WebSocket, AuthenticatedClient>();

// WebSocket server instance (グローバルで管理)
let wss: WebSocketServer | null = null;
let isInitializing = false;

function initWebSocketServer(): Promise<WebSocketServer> {
  return new Promise((resolve, reject) => {
    if (wss) {
      console.log('既存のWebSocketサーバーを再利用します');
      return resolve(wss);
    }

    if (isInitializing) {
      console.log('WebSocketサーバーの初期化を待機中...');
      const checkInterval = setInterval(() => {
        if (wss && !isInitializing) {
          clearInterval(checkInterval);
          resolve(wss);
        }
      }, 100);
      return;
    }

    isInitializing = true;

    try {
      console.log(`WebSocketサーバーをポート${WS_PORT}で起動中...`);
      
      wss = new WebSocketServer({ 
        port: WS_PORT,
        perMessageDeflate: false,
        clientTracking: true
      });

      wss.on('connection', (ws: WebSocket) => {
        console.log('新しいクライアントが接続しました');
        
        const clientId = uuidv4();
        authenticatedClients.set(ws, {
          ws,
          isAuthenticated: false,
          clientId
        });

        // 接続時に現在の状態を送信
        ws.send(JSON.stringify({
          type: 'SYNC_STATE',
          payload: {
            people,
            authenticatedCount: getAuthenticatedCount(),
            clientId
          }
        }));

        ws.on('message', (data: Buffer) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            handleMessage(message, ws);
          } catch (error) {
            console.error('メッセージの解析エラー:', error);
          }
        });

        ws.on('close', () => {
          console.log('クライアントが切断しました');
          authenticatedClients.delete(ws);
          broadcastAuthStatus();
        });

        ws.on('error', (error) => {
          console.error('WebSocketエラー:', error);
          authenticatedClients.delete(ws);
          broadcastAuthStatus();
        });
      });

      wss.on('listening', () => {
        console.log(`WebSocketサーバーがポート${WS_PORT}で起動しました`);
        isInitializing = false;
        resolve(wss!);
      });

      wss.on('error', (error: any) => {
        console.error('WebSocketサーバーエラー:', error);
        isInitializing = false;
        
        if (error.code === 'EADDRINUSE') {
          console.log(`ポート${WS_PORT}は既に使用中です。既存の接続を確認中...`);
          // 既に動作中のサーバーがある場合は、それを使用
          setTimeout(() => {
            if (wss) {
              resolve(wss);
            } else {
              reject(error);
            }
          }, 1000);
        } else {
          reject(error);
        }
      });

    } catch (error) {
      console.error('WebSocketサーバーの作成に失敗:', error);
      isInitializing = false;
      reject(error);
    }
  });
}

function getAuthenticatedCount(): number {
  return Array.from(authenticatedClients.values()).filter(client => client.isAuthenticated).length;
}

function isAuthenticated(ws: WebSocket): boolean {
  const client = authenticatedClients.get(ws);
  return client?.isAuthenticated || false;
}

function broadcastAuthStatus() {
  broadcastToAll({
    type: 'AUTH_STATUS_UPDATE',
    payload: {
      authenticatedCount: getAuthenticatedCount()
    }
  });
}

function handleMessage(message: WebSocketMessage, sender: WebSocket) {
  const client = authenticatedClients.get(sender);
  
  switch (message.type) {
    case 'AUTHENTICATE':
      const { password } = message.payload;
      if (password === ADMIN_PASSWORD) {
        if (client) {
          client.isAuthenticated = true;
        }
        sender.send(JSON.stringify({
          type: 'AUTH_SUCCESS',
          payload: { message: '認証に成功しました' }
        }));
        console.log(`クライアント ${client?.clientId} が認証されました`);
        broadcastAuthStatus();
      } else {
        sender.send(JSON.stringify({
          type: 'AUTH_FAILED',
          payload: { message: 'パスワードが正しくありません' }
        }));
      }
      break;

    case 'ADD_PERSON':
      // 名前追加は認証不要
      const newPerson: Person = {
        id: Date.now(),
        name: message.payload.name.trim(),
        count: 0
      };
      people.push(newPerson);
      
      broadcastToAll({
        type: 'PERSON_ADDED',
        payload: newPerson
      });
      break;

    case 'UPDATE_COUNT':
      // カウント変更は認証が必要
      if (!isAuthenticated(sender)) {
        sender.send(JSON.stringify({
          type: 'AUTH_FAILED',
          payload: { message: 'この操作には認証が必要です' }
        }));
        return;
      }

      const { id, increment } = message.payload;
      const personIndex = people.findIndex(p => p.id === id);
      if (personIndex !== -1) {
        if (increment) {
          people[personIndex].count++;
        } else {
          people[personIndex].count = Math.max(0, people[personIndex].count - 1);
        }
        
        broadcastToAll({
          type: 'COUNT_UPDATED',
          payload: {
            id: people[personIndex].id,
            count: people[personIndex].count
          }
        });
      }
      break;

    case 'REMOVE_PERSON':
      // 削除は認証が必要
      if (!isAuthenticated(sender)) {
        sender.send(JSON.stringify({
          type: 'AUTH_FAILED',
          payload: { message: 'この操作には認証が必要です' }
        }));
        return;
      }

      const removedPersonId = message.payload.id;
      people = people.filter(p => p.id !== removedPersonId);
      
      broadcastToAll({
        type: 'PERSON_REMOVED',
        payload: { id: removedPersonId }
      });
      break;

    default:
      console.log('未知のメッセージタイプ:', message.type);
  }
}

function broadcastToAll(message: WebSocketMessage) {
  const data = JSON.stringify(message);
  authenticatedClients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // WebSocketサーバーを初期化
    await initWebSocketServer();

    return new Response(JSON.stringify({ 
      message: 'WebSocketサーバーが実行中です',
      port: WS_PORT,
      connectedClients: authenticatedClients.size,
      authenticatedClients: getAuthenticatedCount(),
      currentPeople: people
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('WebSocketサーバーエラー:', error);
    return new Response(JSON.stringify({ 
      error: 'WebSocketサーバーの初期化に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// プロセス終了時のクリーンアップ
const cleanup = () => {
  if (wss) {
    console.log('WebSocketサーバーをシャットダウンします');
    wss.close(() => {
      console.log('WebSocketサーバーが正常に終了しました');
    });
    wss = null;
  }
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('beforeExit', cleanup); 