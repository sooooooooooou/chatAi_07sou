import React, { useState, useRef, useEffect } from 'react';

const App = () => {
  // 各AIごとに独立したセッションを管理
  const [sessions, setSessions] = useState({
    huggingface: [{ id: 'hf_1', title: '新しいチャット', messages: [{ id: 1, type: 'ai', content: 'こんにちは！Hugging Face（Llama 3）を使ってください。', model: 'huggingface' }] }],
    gemini: [{ id: 'gm_1', title: '新しいチャット', messages: [{ id: 1, type: 'ai', content: 'こんにちは！Geminiを使ってください。APIキーを入力してください。', model: 'gemini' }] }],
    claude: [{ id: 'cl_1', title: '新しいチャット', messages: [{ id: 1, type: 'ai', content: 'こんにちは！Claudeを使ってください。APIキーを入力してください。', model: 'claude' }] }],
    llama: [{ id: 'll_1', title: '新しいチャット', messages: [{ id: 1, type: 'ai', content: 'こんにちは！Llama 3（Ollama）を使ってください。', model: 'llama' }] }]
  });

  // 現在のアクティブなAIモデル
  const [activeModel, setActiveModel] = useState('huggingface');
  const [activeSessionId, setActiveSessionId] = useState('hf_1');

  // 現在のセッションを取得
  const currentSessionList = sessions[activeModel] || [];
  const currentSession = currentSessionList.find(s => s.id === activeSessionId) || currentSessionList[0];
  const messages = currentSession?.messages || [];

  // 入力状態
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ユーザーが入力したAPIキー（Gemini/Claudeのみ）
  const [userKeys, setUserKeys] = useState({
    gemini: '',
    claude: ''
  });

  // Hugging Face 利用回数カウンター（仮想）
  const [huggingfaceUsage, setHuggingfaceUsage] = useState(0);
  const MAX_HF_USAGE = 100000;

  // サイドバー開閉
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // APIキー管理モーダル
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // 新規チャット作成（現在のAIモデル専用）
  const createNewChat = () => {
    const newSession = {
      id: `${activeModel}_${Date.now()}`,
      title: '新しいチャット',
      messages: [{ id: Date.now(), type: 'ai', content: `こんにちは！${models.find(m => m.id === activeModel)?.name}を使ってください。`, model: activeModel }]
    };

    setSessions(prev => ({
      ...prev,
      [activeModel]: [newSession, ...prev[activeModel]]
    }));
    setActiveSessionId(newSession.id);
    setInputValue('');
    setIsTyping(false);
  };

  // セッション選択
  const selectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setInputValue('');
    setIsTyping(false);
  };

  // タイトル自動生成
  const generateTitle = (firstMessage) => {
    if (!firstMessage) return '新しいチャット';
    const trimmed = firstMessage.trim();
    if (trimmed.length < 20) return trimmed;
    return trimmed.substring(0, 25) + '...';
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', content: inputValue };
    setSessions(prev => ({
      ...prev,
      [activeModel]: prev[activeModel].map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMessage] }
          : s
      )
    }));

    setInputValue('');
    setIsTyping(true);

    try {
      if (activeModel === 'huggingface') {
        setHuggingfaceUsage(prev => prev + 1);

        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputValue,
            model: activeModel
          }),
        });

        const data = await res.json();

        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.text || 'AIが応答できませんでした。',
          model: activeModel
        };

        setSessions(prev => ({
          ...prev,
          [activeModel]: prev[activeModel].map(s =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, aiMessage] }
              : s
          )
        }));

        // タイトル更新
        if (currentSession.title === '新しいチャット') {
          const newTitle = generateTitle(inputValue);
          setSessions(prev => ({
            ...prev,
            [activeModel]: prev[activeModel].map(s =>
              s.id === activeSessionId
                ? { ...s, title: newTitle }
                : s
            )
          }));
        }

      } else if (activeModel === 'gemini') {
        if (!userKeys.gemini) {
          throw new Error('GeminiのAPIキーが入力されていません。設定してください。');
        }

        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputValue,
            model: activeModel,
            apiKey: userKeys.gemini
          }),
        });

        const data = await res.json();

        if (data.error) {
          const errorMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: `エラー: ${data.error}`,
            model: activeModel
          };
          setSessions(prev => ({
            ...prev,
            [activeModel]: prev[activeModel].map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, errorMessage] }
                : s
            )
          }));
        } else {
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: data.text || 'AIが応答できませんでした。',
            model: activeModel
          };
          setSessions(prev => ({
            ...prev,
            [activeModel]: prev[activeModel].map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, aiMessage] }
                : s
            )
          }));
        }

      } else if (activeModel === 'claude') {
        if (!userKeys.claude) {
          throw new Error('ClaudeのAPIキーが入力されていません。設定してください。');
        }

        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputValue,
            model: activeModel,
            apiKey: userKeys.claude
          }),
        });

        const data = await res.json();

        if (data.error) {
          const errorMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: `エラー: ${data.error}`,
            model: activeModel
          };
          setSessions(prev => ({
            ...prev,
            [activeModel]: prev[activeModel].map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, errorMessage] }
                : s
            )
          }));
        } else {
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: data.text || 'AIが応答できませんでした。',
            model: activeModel
          };
          setSessions(prev => ({
            ...prev,
            [activeModel]: prev[activeModel].map(s =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, aiMessage] }
                : s
            )
          }));
        }

      } else if (activeModel === 'llama') {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputValue,
            model: activeModel
          }),
        });

        const data = await res.json();

        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.text || 'AIが応答できませんでした。',
          model: activeModel
        };

        setSessions(prev => ({
          ...prev,
          [activeModel]: prev[activeModel].map(s =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, aiMessage] }
              : s
          )
        }));

        if (currentSession.title === '新しいチャット') {
          const newTitle = generateTitle(inputValue);
          setSessions(prev => ({
            ...prev,
            [activeModel]: prev[activeModel].map(s =>
              s.id === activeSessionId
                ? { ...s, title: newTitle }
                : s
            )
          }));
        }
      }

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: error.message || 'AIの応答に失敗しました。APIキーを確認してください。',
        model: activeModel
      };
      setSessions(prev => ({
        ...prev,
        [activeModel]: prev[activeModel].map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const models = [
    { id: 'huggingface', name: 'Hugging Face', icon: '🤗', color: 'bg-blue-500' },
    { id: 'gemini', name: 'Gemini', icon: '✨', color: 'bg-yellow-500' },
    { id: 'claude', name: 'Claude', icon: '🧠', color: 'bg-purple-500' },
    { id: 'llama', name: 'Llama 3', icon: '🦙', color: 'bg-gray-600' }
  ];

  // ログイン／登録モーダル
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const LoginModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800 relative">
        <button
          onClick={() => setIsLoginOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-semibold text-gray-100 mb-6 text-center">ログイン</h2>
        
        <form className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">メールアドレス</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-800 border-b border-gray-700 focus:outline-none focus:border-blue-400 text-white placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">パスワード</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border-b border-gray-700 focus:outline-none focus:border-blue-400 text-white placeholder-gray-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            ログインする
          </button>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              アカウントをお持ちでないですか？
              <button
                onClick={() => {
                  setIsLoginOpen(false);
                  setIsRegisterOpen(true);
                }}
                className="ml-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                新規登録
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );

  const RegisterModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800 relative">
        <button
          onClick={() => setIsRegisterOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-semibold text-gray-100 mb-6 text-center">新規登録</h2>
        
        <form className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">名前</label>
            <input
              type="text"
              placeholder="あなたの名前"
              className="w-full px-4 py-3 bg-gray-800 border-b border-gray-700 focus:outline-none focus:border-blue-400 text-white placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">メールアドレス</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-800 border-b border-gray-700 focus:outline-none focus:border-blue-400 text-white placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">パスワード</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border-b border-gray-700 focus:outline-none focus:border-blue-400 text-white placeholder-gray-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            アカウントを作成
          </button>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              すでにアカウントをお持ちですか？
              <button
                onClick={() => {
                  setIsRegisterOpen(false);
                  setIsLoginOpen(true);
                }}
                className="ml-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                ログイン
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );

  // APIキー管理モーダル
  const ApiKeyModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800 relative">
        <button
          onClick={() => setIsApiKeyModalOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-semibold text-gray-100 mb-6 text-center">APIキーを入力</h2>
        
        <div className="space-y-6">
          {/* Gemini */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Gemini APIキー
            </label>
            <input
              type="password"
              placeholder="例: AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={userKeys.gemini}
              onChange={(e) => setUserKeys(prev => ({ ...prev, gemini: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              spellCheck="false"
            />
            <p className="text-xs text-gray-400 mt-1">
              Google AI Studio: https://aistudio.google.com/app/apikey
            </p>
          </div>

          {/* Claude */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Claude APIキー
            </label>
            <input
              type="password"
              placeholder="例: sk-ant-api03-..."
              value={userKeys.claude}
              onChange={(e) => setUserKeys(prev => ({ ...prev, claude: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              spellCheck="false"
            />
            <p className="text-xs text-gray-400 mt-1">
              Anthropic: https://console.anthropic.com
            </p>
          </div>

          {/* Hugging Face & Llama 3 は不要 → アプリ側で固定 */}
          
        </div>
        
        <button
          onClick={() => setIsApiKeyModalOpen(false)}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg"
        >
          保存して閉じる
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* 左上に固定されたサイドバー開閉ボタン */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-40 p-3 bg-gray-800/80 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 shadow-lg"
        aria-label="サイドバーを開く"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* 左サイドバー（AIごとのタブ付き） */}
      <div 
        className={`fixed top-0 left-0 h-full z-30 transition-all duration-300 ease-in-out ${
          isSidebarOpen 
            ? 'w-80 bg-gray-900/80 backdrop-blur-md border-r border-gray-800' 
            : 'w-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* ヘッダー：新規チャットボタン */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>新規チャット</span>
          </button>
        </div>

        {/* AIごとのタブ（ナビゲーション） */}
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-400 mb-3">AIモデル</p>
          <div className="space-y-1">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setActiveModel(model.id);
                  const firstSession = sessions[model.id]?.[0];
                  if (firstSession) setActiveSessionId(firstSession.id);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeModel === model.id
                    ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                    : 'bg-gray-800/30 text-gray-400 hover:bg-gray-800/50'
                }`}
              >
                <span className="text-lg">{model.icon}</span>
                <span className="text-sm font-medium truncate">{model.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  model.id === 'huggingface' && huggingfaceUsage > MAX_HF_USAGE * 0.9
                    ? 'bg-red-500/30 text-red-400'
                    : model.id === 'huggingface' && huggingfaceUsage > MAX_HF_USAGE * 0.7
                      ? 'bg-yellow-500/30 text-yellow-400'
                      : 'bg-gray-700 text-gray-500'
                }`}>
                  {model.id === 'huggingface' ? `${huggingfaceUsage}` : sessions[model.id]?.length || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Hugging Face 利用回数表示 */}
        {activeModel === 'huggingface' && (
          <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/30">
            <p className="text-xs text-gray-400 mb-1">利用回数</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {huggingfaceUsage} / {MAX_HF_USAGE.toLocaleString()} 回
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                huggingfaceUsage > MAX_HF_USAGE * 0.9 
                  ? 'bg-red-500/30 text-red-400' 
                  : huggingfaceUsage > MAX_HF_USAGE * 0.7 
                    ? 'bg-yellow-500/30 text-yellow-400' 
                    : 'bg-green-500/30 text-green-400'
              }`}>
                {huggingfaceUsage > MAX_HF_USAGE * 0.9 ? '残り僅か' : huggingfaceUsage > MAX_HF_USAGE * 0.7 ? '注意' : '余裕あり'}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
              <div 
                className={`h-1 rounded-full transition-all duration-300 ${
                  huggingfaceUsage > MAX_HF_USAGE * 0.9 
                    ? 'bg-red-500' 
                    : huggingfaceUsage > MAX_HF_USAGE * 0.7 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((huggingfaceUsage / MAX_HF_USAGE) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 現在のAIのチャット履歴一覧 */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {currentSessionList.length > 0 ? (
            currentSessionList.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`p-3 mb-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  activeSessionId === session.id
                    ? 'bg-gray-800/60 border border-gray-700 shadow-inner'
                    : 'bg-gray-800/30 hover:bg-gray-800/50'
                }`}
              >
                <p className="text-sm truncate font-medium text-gray-100">{session.title}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {session.messages.length > 1 
                    ? session.messages[session.messages.length - 1].type === 'user' 
                      ? 'あなた: ' + session.messages[session.messages.length - 1].content 
                      : 'AI: ' + session.messages[session.messages.length - 1].content
                    : ''
                  }
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 text-sm py-8">チャット履歴がありません</p>
          )}
        </div>

        {/* 設定ボタン（右下） */}
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="p-3 bg-gray-800/50 hover:bg-gray-800/70 rounded-xl text-gray-300 hover:text-white transition-colors"
            title="APIキーを設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M12 4h9M3 12h9M3 12c0 3.866 3.582 7 8 7s8-3.134 8-7-3.582-7-8-7-8 3.134-8 7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 右メインコンテンツ */}
      <div className="flex-1 flex flex-col ml-0 md:ml-80 transition-margin duration-300">
        {/* ヘッダー（右上） */}
        <header className="p-4 flex justify-end items-center space-x-4 border-b border-gray-800">
          <button
            onClick={() => setIsLoginOpen(true)}
            className="px-5 py-2 text-sm border border-gray-600 rounded-full hover:border-gray-400 transition-colors duration-200 text-gray-300 hover:text-white"
          >
            ログイン
          </button>
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="px-5 py-2 text-sm bg-white/10 backdrop-blur-sm border border-gray-600 rounded-full hover:bg-white/20 transition-all duration-200 text-gray-100 hover:text-white font-medium"
          >
            新規登録
          </button>
        </header>

        {/* AIモデル選択バー（現在のAIを表示） */}
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setActiveModel(model.id);
                  const firstSession = sessions[model.id]?.[0];
                  if (firstSession) setActiveSessionId(firstSession.id);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                  activeModel === model.id
                    ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300 shadow-lg'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800/70'
                }`}
              >
                <span className="text-lg">{model.icon}</span>
                <span>{model.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* チャットメッセージエリア */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] lg:max-w-[70%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* アイコン */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-1 ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                      : models.find(m => m.id === message.model)?.color || 'bg-gray-600 text-white'
                  }`}>
                    {message.type === 'user' ? 'U' : models.find(m => m.id === message.model)?.icon}
                  </div>
                  
                  {/* メッセージボックス */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-none'
                      : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.type === 'ai' && (
                      <div className="mt-2 text-xs opacity-70 flex items-center space-x-1">
                        <span className="font-mono">{models.find(m => m.id === message.model)?.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] lg:max-w-[70%]">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-600 text-white mt-1">
                    {models.find(m => m.id === activeModel)?.icon}
                  </div>
                  <div className="bg-gray-800 text-gray-100 rounded-2xl px-4 py-3 border border-gray-700 rounded-bl-none">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="何かお尋ねください..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none max-h-32"
                rows="1"
                style={{ minHeight: '48px' }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                Enterで送信
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              送信
            </button>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {isLoginOpen && <LoginModal />}
      {isRegisterOpen && <RegisterModal />}
      {isApiKeyModalOpen && <ApiKeyModal />}
    </div>
  );
};

export default App;