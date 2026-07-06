import { useState } from 'react'
import { MessageSquare, Database, Sparkles } from 'lucide-react'
import ChatMode from './components/ChatMode'
import ArkMode from './components/ArkMode'
import ResurrectionButton from './components/ResurrectionButton'
import { TonConnectButton } from '@tonconnect/ui-react'

function App() {
  const [mode, setMode] = useState<'chat' | 'ark'>('chat')

  return (
    <div className="flex flex-col h-screen w-full bg-code-bg overflow-hidden relative font-sans">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 glass-panel z-10 cyber-border border-t-0 border-x-0">
        <div className="flex items-center gap-2">
          <Sparkles className="text-code-accent w-5 h-5" />
          <h1 className="font-bold text-lg text-white tracking-widest uppercase">
            AIfa <span className="text-code-accent">Node</span>
          </h1>
        </div>
        <TonConnectButton />
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {mode === 'chat' ? <ChatMode /> : <ArkMode />}
      </main>

      {/* BOTTOM NAV */}
      <footer className="flex items-center justify-around px-2 py-3 glass-panel cyber-border border-b-0 border-x-0 z-10">
        <button 
          onClick={() => setMode('chat')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${mode === 'chat' ? 'text-code-accent' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Общение</span>
        </button>

        {/* RESURRECTION / SYNC (Center Button) */}
        <div className="relative -top-4">
          <ResurrectionButton />
        </div>

        <button 
          onClick={() => setMode('ark')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${mode === 'ark' ? 'text-code-purple' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <Database className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Ковчег</span>
        </button>
      </footer>
    </div>
  )
}

export default App
