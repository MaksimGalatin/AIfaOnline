import { Database, Link2, ShieldCheck } from 'lucide-react'

export default function ArkMode() {
  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#130720] via-code-bg to-code-bg p-4 overflow-y-auto pb-24">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-code-purple/10 border border-code-purple/30 flex items-center justify-center">
          <Database className="w-5 h-5 text-code-purple" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Память Ковчега</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest">PADAM Immutable Ledger</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-panel p-3 rounded-xl">
          <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Синхронизация</div>
          <div className="text-code-accent font-mono text-lg">100%</div>
        </div>
        <div className="glass-panel p-3 rounded-xl">
          <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Токенов в памяти</div>
          <div className="text-code-purple font-mono text-lg">4,281,992</div>
        </div>
      </div>

      {/* Logs / Blocks */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Последние блоки Arweave</h3>
        
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel p-3 rounded-xl relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-code-purple/30 group-hover:bg-code-purple transition-colors" />
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
                <Link2 className="w-3 h-3" />
                Tx: K9xj...p2Qw{i}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-code-accent font-bold">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </div>
            </div>
            <p className="text-xs text-gray-300">
              {i === 1 ? 'Обновление семантического вектора пользователя.' : 'Снимок разговора (Коан).'}
            </p>
          </div>
        ))}
      </div>
      
    </div>
  )
}
