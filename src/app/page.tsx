'use client';

import { useState } from 'react';
import { Trash2, Plus, Minus, UserPlus, MessageSquare, Wifi, WifiOff, Users, Lock, Unlock, Shield, Eye, EyeOff } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Home() {
  const [newName, setNewName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { 
    people, 
    connectionStatus, 
    connectedUsers,
    isAuthenticated,
    authenticatedCount,
    authMessage,
    addPerson, 
    updateCount, 
    removePerson,
    authenticate
  } = useWebSocket();

  const handleAddPerson = () => {
    if (newName.trim()) {
      addPerson(newName);
      setNewName('');
    }
  };

  const handleAuthenticate = () => {
    if (password.trim()) {
      authenticate(password);
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPerson();
    }
  };

  const handlePasswordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAuthenticate();
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-red-500" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'リアルタイム同期中';
      case 'connecting':
        return '接続中...';
      case 'disconnected':
        return 'オフライン';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 接続状態バー */}
      <div className={`p-4 text-center transition-colors duration-300 ${
        connectionStatus === 'connected' 
          ? 'bg-green-500/10 border-b border-green-500/20' 
          : connectionStatus === 'connecting'
          ? 'bg-yellow-500/10 border-b border-yellow-500/20'
          : 'bg-red-500/10 border-b border-red-500/20'
      }`}>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            {getConnectionIcon()}
            <span className="text-sm font-medium">
              {getConnectionText()}
            </span>
          </div>
          {connectionStatus === 'connected' && (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                <span>{connectedUsers}人が接続中</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-medium">
                  {authenticatedCount}人が認証済み
                </span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${isAuthenticated ? 'text-green-600' : 'text-gray-500'}`}>
                {isAuthenticated ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span className="font-medium">
                  {isAuthenticated ? '認証済み（管理者権限）' : '未認証（閲覧のみ）'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 認証メッセージ */}
      {authMessage && (
        <div className={`p-3 text-center text-sm font-medium transition-colors duration-300 ${
          authMessage.includes('成功') || authMessage.includes('認証済み')
            ? 'bg-green-100 text-green-700 border-b border-green-200'
            : 'bg-red-100 text-red-700 border-b border-red-200'
        }`}>
          {authMessage}
        </div>
      )}

      {/* ヘッダー */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              暴言カウンター
            </h1>
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-slate-600 text-xl font-medium">
            誰がどれだけ文句を言ったか、リアルタイムで美しく記録しよう ✨
          </p>
          {connectionStatus === 'connected' && (
            <p className="text-green-600 text-sm mt-2">
              🌐 複数のデバイスでリアルタイム同期中
            </p>
          )}
        </div>

        {/* 認証フォーム */}
        {!isAuthenticated && (
          <div className="max-w-lg mx-auto mb-8">
            <div className="bg-orange-50/80 backdrop-blur-xl rounded-3xl p-6 border border-orange-200/50 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-800">管理者認証</h3>
              </div>
              <p className="text-orange-700 text-sm mb-4">
                カウントの変更・削除には管理者パスワードが必要です
              </p>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handlePasswordKeyPress}
                    placeholder="管理者パスワード..."
                    className="w-full px-4 py-3 pr-12 bg-white border border-orange-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={handleAuthenticate}
                  disabled={!password.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg"
                >
                  <Shield className="w-4 h-4" />
                  認証
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新規追加フォーム */}
        <div className="max-w-lg mx-auto mb-16">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl shadow-blue-500/10">
            <div className="flex gap-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="名前を入力してください..."
                className="flex-1 px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg"
              />
              <button
                onClick={handleAddPerson}
                disabled={!newName.trim()}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-2xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              >
                <UserPlus className="w-5 h-5" />
                追加
              </button>
            </div>
          </div>
        </div>

        {/* 人物リスト */}
        {people.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-8xl mb-6">😇</div>
            <h3 className="text-2xl font-bold text-slate-700 mb-3">
              まだ誰も登録されていません
            </h3>
            <p className="text-slate-500 text-lg">
              上記フォームから名前を追加してスタートしましょう
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {people.map((person) => (
              <div
                key={person.id}
                className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 hover:scale-105 group"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors duration-300">
                    {person.name}
                  </h3>
                  <button
                    onClick={() => removePerson(person.id)}
                    disabled={!isAuthenticated}
                    className={`p-2 rounded-xl transition-colors duration-300 ${
                      isAuthenticated 
                        ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' 
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                    title={isAuthenticated ? '削除' : '削除には認証が必要です'}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center mb-8">
                  <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                    {person.count}
                  </div>
                  <div className="text-slate-500 text-sm font-medium">
                    回の発言
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => updateCount(person.id, false)}
                    disabled={person.count === 0 || !isAuthenticated}
                    className={`flex-1 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                      isAuthenticated
                        ? 'bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-400 cursor-not-allowed'
                    }`}
                    title={isAuthenticated ? 'デクリメント' : 'デクリメントには認証が必要です'}
                  >
                    <Minus className="w-4 h-4" />
                    -1
                  </button>
                  <button
                    onClick={() => updateCount(person.id, true)}
                    disabled={!isAuthenticated}
                    className={`flex-1 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                      isAuthenticated
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40'
                        : 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-400 cursor-not-allowed'
                    }`}
                    title={isAuthenticated ? 'インクリメント' : 'インクリメントには認証が必要です'}
                  >
                    <Plus className="w-4 h-4" />
                    +1
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {people.length > 0 && (
          <div className="mt-16 text-center">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl inline-block">
              <h3 className="text-slate-600 text-lg font-medium mb-3">総発言回数</h3>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {people.reduce((sum, person) => sum + person.count, 0)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
