import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Send, Plus, Mic, ArrowUp } from 'lucide-react';

const Homer = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "You'd love to be greeted by B telling you that business is doing 20% better. As a matter of fact, you'd probably even want a graph:",
      hasChart: true
    },
    {
      id: 2,
      type: 'assistant',
      content: "We'd explain the graph, and perhaps even give you a few reasons why we think the graph looks the way it does. From there, we'd suggest a next step, for example: do you want me to show you today's performance against last Sunday's performance?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef(null);

  // Sample data for the chart
  const chartData = [
    { time: 0, value: 45 },
    { time: 1, value: 48 },
    { time: 2, value: 52 },
    { time: 3, value: 49 },
    { time: 4, value: 55 },
    { time: 5, value: 58 },
    { time: 6, value: 54 },
    { time: 7, value: 60 },
    { time: 8, value: 63 },
    { time: 9, value: 58 },
    { time: 10, value: 65 },
    { time: 11, value: 68 },
    { time: 12, value: 72 },
    { time: 13, value: 69 },
    { time: 14, value: 75 },
    { time: 15, value: 78 },
    { time: 16, value: 82 },
    { time: 17, value: 85 }
  ];

  // Auto-responses for AI
  const aiResponses = [
    "Great question! Let me analyze that for you. Based on the current data, I can see a positive trend in your business performance.",
    "I've compared today's performance with last Sunday's data. You're showing a 15% improvement in key metrics!",
    "Looking at the weekly overview, your peak performance times are between 2-5 PM. Would you like me to break down the specific factors contributing to this?",
    "I can help you optimize your business strategy. What specific aspect would you like to focus on - revenue, customer engagement, or operational efficiency?",
    "Based on your historical data, I predict continued growth of 3-5% over the next week if current trends continue."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      // Add user message
      const newUserMessage = {
        id: messages.length + 1,
        type: 'user',
        content: message
      };
      
      setMessages(prev => [...prev, newUserMessage]);
      setMessage('');
      setIsTyping(true);
      
      // Simulate AI response after a delay
      setTimeout(() => {
        const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        const newAIMessage = {
          id: messages.length + 2,
          type: 'assistant',
          content: randomResponse
        };
        setMessages(prev => [...prev, newAIMessage]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${msg.type === 'user' ? 'order-2' : ''}`}>
                <div className={`rounded-2xl px-6 py-4 ${
                  msg.type === 'user' 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-white shadow-sm'
                }`}>
                  <p className={`text-lg leading-relaxed ${msg.type === 'user' ? 'text-white' : 'text-gray-700'}`}>
                    {msg.content}
                  </p>
                  
                  {msg.hasChart && (
                    <div className="mt-6">
                      {/* Time Period Selector */}
                      <div className="flex gap-2 mb-6">
                        <button className="px-4 py-2 bg-pink-200 text-pink-800 rounded-full text-sm font-medium">
                          1D
                        </button>
                        <button className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                          1W
                        </button>
                        <button className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                          1M
                        </button>
                        <button className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                          3M
                        </button>
                        <button className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                          1Y
                        </button>
                      </div>

                      {/* Chart */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis 
                              dataKey="time" 
                              axisLine={false}
                              tickLine={false}
                              tick={false}
                            />
                            <YAxis hide />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#ec4899" 
                              strokeWidth={3}
                              dot={false}
                              activeDot={{ r: 4, fill: "#ec4899" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
                
                {msg.type === 'user' && (
                  <div className="mt-2 text-right">
                    <span className="text-sm text-gray-500">You</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm rounded-2xl px-6 py-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input Section */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            {/* Add Button */}
            <button className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-gray-600" />
            </button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="How can I help you?"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>

            {/* Voice Button */}
            <button className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
              <Mic className="w-5 h-5 text-gray-600" />
            </button>

            {/* Send Button */}
            <button 
              onClick={handleSendMessage}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                message.trim() 
                  ? 'bg-pink-500 hover:bg-pink-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              disabled={!message.trim()}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homer;