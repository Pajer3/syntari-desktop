import { useChatViewModel } from '../../hooks/useChatViewModel';
import type { ChatMessage } from '../../types';

interface ChatViewProps {
  chatViewModel: ReturnType<typeof useChatViewModel>;
}

export const ChatView: React.FC<ChatViewProps> = ({ chatViewModel }) => {
  const { viewModel, sendMessage, setInput, toggleSmartRouting } = chatViewModel;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewModel.input.trim()) {
      sendMessage(viewModel.input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">{viewModel.session.name}</h1>
          <span className="text-sm text-gray-400">
            {viewModel.session.context.projectType} project
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-400">
            💰 ${chatViewModel.totalCost.toFixed(6)} spent
          </span>
          <button 
            onClick={toggleSmartRouting}
            className={`px-3 py-1 rounded text-xs ${
              viewModel.smartRouting 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            🧠 Smart Routing: {viewModel.smartRouting ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 ide-scrollbar">
        {viewModel.session.messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <div className="text-4xl mb-4">💬</div>
            <p>Start a conversation with your AI assistant</p>
            <p className="text-sm mt-2">Project: {viewModel.session.context.projectType}</p>
          </div>
        ) : (
          viewModel.session.messages.map((message: ChatMessage, index: number) => (
            <div 
              key={message.id || index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-100'
              }`}>
                <p className="text-sm">{message.content}</p>
                {message.metadata?.provider && (
                  <p className="text-xs mt-1 opacity-70">
                    via {message.metadata.provider} • ${message.metadata.cost?.toFixed(6) || '0.000000'}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        
        {viewModel.isTyping && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 bg-gray-700 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/30">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={viewModel.input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your project..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            disabled={viewModel.isTyping}
          />
          <button
            type="submit"
            disabled={viewModel.isTyping || !viewModel.input.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}; 