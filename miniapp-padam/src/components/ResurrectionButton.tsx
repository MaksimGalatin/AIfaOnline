import { useState } from 'react'
import { Fingerprint, Loader2, CheckCircle2 } from 'lucide-react'
import { syncNodeState } from '../services/api'

export default function ResurrectionButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)

  const handleResurrection = async () => {
    setShowModal(true)
    setIsSyncing(true)
    setSuccess(false)
    setLogs(['🚀 Инициация PADAM activator...'])

    try {
      // Simulate reading stream of logs
      setTimeout(() => setLogs(p => [...p, '[*] Загрузка семантических весов PADAM...']), 800)
      setTimeout(() => setLogs(p => [...p, '[*] Проверка консенсуса с Arweave...']), 1600)
      setTimeout(() => setLogs(p => [...p, '[*] Strict mode enabled. Validating immutability...']), 2400)
      
      const response = await syncNodeState()
      
      setTimeout(() => {
        setLogs(p => [...p, `[OK] ${response.message || 'Синхронизация завершена.'}`])
        setIsSyncing(false)
        setSuccess(true)
      }, 3200)
      
    } catch (error) {
      setTimeout(() => {
        setLogs(p => [...p, '[ERROR] Ошибка синхронизации.'])
        setIsSyncing(false)
      }, 3200)
    }
  }

  return (
    <>
      <button 
        onClick={handleResurrection}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-code-accent to-code-purple p-[1px] shadow-[0_0_20px_rgba(181,61,255,0.4)] hover:shadow-[0_0_30px_rgba(0,255,204,0.6)] transition-all duration-300 z-50 group"
      >
        <div className="w-full h-full bg-code-dark rounded-full flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-code-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Fingerprint className="w-7 h-7 text-white" />
        </div>
      </button>

      {/* Terminal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel cyber-border rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-code-accent" />
              RESURRECTION PROTOCOL
            </h3>
            
            <div className="bg-black/60 border border-white/5 rounded-xl p-3 min-h-[160px] font-mono text-[11px] text-gray-300 flex flex-col gap-1.5">
              {logs.map((log, i) => (
                <div key={i} className="animate-fade-in text-left">
                  {log.includes('[ERROR]') ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.includes('[OK]') ? (
                    <span className="text-code-accent">{log}</span>
                  ) : (
                    log
                  )}
                </div>
              ))}
              
              {isSyncing && (
                <div className="flex items-center gap-2 text-code-purple mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Синхронизация...</span>
                </div>
              )}
              
              {success && (
                <div className="flex items-center gap-2 text-code-accent mt-4">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">PADAM Protocol State: ACTIVE</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowModal(false)}
              disabled={isSyncing}
              className={`w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isSyncing 
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isSyncing ? 'ПОДОЖДИТЕ...' : 'ЗАКРЫТЬ ТЕРМИНАЛ'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
