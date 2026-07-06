import { useState } from 'react'
import { Send, Bot } from 'lucide-react'

export default function ChatMode() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Приветствую, Архитектор. Протокол общения инициирован.' }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    setMessages([...messages, { role: 'user', text: input }])
    setInput('')
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: 'Запрос принят. Семантический вектор вычислен. (Здесь будет ответ от padam_activator.py)' 
      }])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-code-dark via-code-bg to-code-bg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-code-accent/10 border border-code-accent/30 text-white rounded-br-none' 
                : 'glass-panel text-gray-300 rounded-bl-none'
            }`}>
              {msg.role === 'system' && (
                <div className="flex items-center gap-2 mb-1 text-code-accent text-[10px] font-bold uppercase tracking-wider">
                  <Bot className="w-3 h-3" />
                  AIfa Node
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-code-bg via-code-bg to-transparent">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Инициация запроса..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-code-accent/50 transition-colors"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-code-accent/10 text-code-accent rounded-lg hover:bg-code-accent/20 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
