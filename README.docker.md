# 暴言カウンター - Docker環境

リアルタイム暴言カウンターアプリケーションのDocker環境です。

## 🚀 クイックスタート

### 1. Docker環境でアプリケーションを起動

```bash
# プロジェクトをビルドして起動
docker-compose up --build

# バックグラウンドで起動する場合
docker-compose up --build -d
```

### 2. アプリケーションにアクセス

- **メインアプリケーション**: http://localhost:3500
- **Health Check**: http://localhost:3500/health

## 🌐 アーキテクチャ

```
外部 → nginx (Port 3500) → Next.js (Port 3000/8080)
```

### プロキシ設定

- **`/`** → Next.js HTTP (ポート3000)
- **`/ws`** → Next.js WebSocket (ポート8080)

## 📁 ファイル構成

```
.
├── docker-compose.yaml       # Docker Compose設定
├── Dockerfile                # Next.jsアプリ用Dockerfile
├── nginx/
│   ├── Dockerfile           # nginx用Dockerfile
│   └── nginx.conf           # nginx設定ファイル
├── src/                     # Next.jsソースコード
└── README.docker.md         # このファイル
```

## 🔧 設定

### 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `PORT` | 3000 | Next.js HTTPポート |
| `WS_PORT` | 8080 | WebSocketポート |
| `ADMIN_PASSWORD` | admin123 | 管理者パスワード |

### カスタマイズ

環境変数を変更したい場合は、`docker-compose.yaml`の`environment`セクションを編集してください。

## 🐳 Docker コマンド

### 起動・停止

```bash
# 起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# 停止
docker-compose down

# 停止してボリュームも削除
docker-compose down -v
```

### ログ確認

```bash
# 全サービスのログ
docker-compose logs

# 特定サービスのログ
docker-compose logs nextjs-app
docker-compose logs nginx

# リアルタイムでログを追跡
docker-compose logs -f
```

### 再ビルド

```bash
# 強制再ビルド
docker-compose build --no-cache

# 再ビルドして起動
docker-compose up --build
```

## 🔍 ヘルスチェック

各サービスにはヘルスチェックが設定されています：

```bash
# コンテナの状態確認
docker ps

# ヘルスチェック詳細
docker inspect counter-nextjs | grep -A 5 Health
docker inspect counter-nginx | grep -A 5 Health
```

## 🌍 本番環境での使用

本番環境で使用する場合の推奨設定：

1. **環境変数の設定**:
   ```yaml
   environment:
     - NODE_ENV=production
     - ADMIN_PASSWORD=${SECURE_PASSWORD}
   ```

2. **リソース制限**:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

3. **ログローテーション**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## 🛠️ トラブルシューティング

### よくある問題

1. **ポートが既に使用中**:
   ```bash
   # ポート使用状況確認
   lsof -i :3500
   
   # 別のポートを使用
   sed -i 's/3500:3500/3501:3500/' docker-compose.yaml
   ```

2. **WebSocket接続エラー**:
   - ブラウザの開発者ツールでWebSocketのURL確認
   - nginx設定のプロキシパス確認

3. **コンテナが起動しない**:
   ```bash
   # 詳細ログ確認
   docker-compose logs nextjs-app
   
   # コンテナ内に入って調査
   docker exec -it counter-nextjs sh
   ```

## 📝 開発・デバッグ

開発時は直接Next.jsのポートにもアクセス可能：

- **Next.js HTTP**: http://localhost:3000
- **Next.js WebSocket**: ws://localhost:8080

これにより、nginxをバイパスしてデバッグできます。 