export default function AiChatPanel() {
  return (
    <div className="h-full bg-[#13111c] border border-gray-800 rounded-lg flex flex-col">
      <div className="p-4 border-b border-gray-800 text-white font-semibold">IA Trader</div>
      <div className="flex-1 p-4 text-sm text-gray-400">
        Histórico de mensagens
      </div>
      <div className="p-4 border-t border-gray-800">
        <div className="w-full bg-[#0d0a18] border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-sm">
          Digite sua mensagem...
        </div>
      </div>
    </div>
  );
}
