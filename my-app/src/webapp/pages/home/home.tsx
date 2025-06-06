// src/Homer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChatInputBar from './ChatInputBar';

type MessageType = 'user' | 'assistant';

interface Message {
  id: number;
  type: MessageType;
  content: string;
  hasChart?: boolean;
}

const Homer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'assistant',
      content:
        "You'd love to be greeted by B telling you that business is doing 20% better. As a matter of fact, you'd probably even want a graph:",
      hasChart: true,
    },
    {
      id: 2,
      type: 'assistant',
      content:
        "We'd explain the graph, and perhaps even give you a few reasons why we think the graph looks the way it does. From there, we'd suggest a next step, for example: do you want me to show you today's performance against last Sunday's performance?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    { time: 17, value: 85 },
  ];

  // Pre‐defined “AI” responses
  const aiResponses: string[] = [
    "Great question! Let me analyze that for you. Based on the current data, I can see a positive trend in your business performance.",
    "I've compared today's performance with last Sunday's data. You're showing a 15% improvement in key metrics!",
    "Looking at the weekly overview, your peak performance times are between 2-5 PM. Would you like me to break down the specific factors contributing to this?",
    "I can help you optimize your business strategy. What specific aspect would you like to focus on - revenue, customer engagement, or operational efficiency?",
    "Based on your historical data, I predict continued growth of 3-5% over the next week if current trends continue.",
  ];

  // Scroll to bottom whenever messages array changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Called when user clicks “send”
  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newUserMsg: Message = {
      id: messages.length + 1,
      type: 'user',
      content: message.trim(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setMessage('');
    setIsTyping(true);

    // Fake AI “thinking” delay
    setTimeout(() => {
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const includeChart = Math.random() < 0.3; // 30% chance to include a chart

      const newAIMessage: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: randomResponse,
        hasChart: includeChart,
      };

      setMessages((prev) => [...prev, newAIMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  return (
    <div className="mt-[4vh] h-[96vh] flex flex-col overflow-hidden">
      {/* ───── Messages Container ───── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[1024px] mx-auto flex flex-col gap-6">
          {messages.map((msg) => {
            const isUser = msg.type === 'user';

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[768px] ${isUser ? 'order-2' : ''}`}>
                  <div
                    className={`${
                      isUser
                        ? 'border border-pink-600 bg-pink-100 text-pink-800'
                        : 'text-gray-700'
                    } rounded-[24px] p-4`}
                  >
                    <p className="text-lg leading-7 m-0">{msg.content}</p>

                    {msg.hasChart && (
                      <div className="mt-6">
                        {/* Time Period Selector */}
                        <div className="flex gap-2 mb-6">
                          <button className="px-4 py-2 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
                            1D
                          </button>
                          {['1W', '1M', '3M', '1Y'].map((label) => (
                            <button
                              key={label}
                              className="px-4 py-2 bg-transparent text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Chart */}
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={false} />
                              <YAxis hide />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#EC4899"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 4, fill: '#EC4899' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="mt-2 text-right">
                      <span className="text-sm text-gray-500">You</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/90 border border-gray-200 rounded-[24px] p-5 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                {/* Animated Dots */}
                <div className="flex gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-600 to-pink-300 opacity-85 animate-[dotFade_1.2s_infinite] animation-delay-0"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-600 to-pink-300 opacity-70 animate-[dotFade_1.2s_infinite] animation-delay-[200ms]"
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-600 to-pink-300 opacity-55 animate-[dotFade_1.2s_infinite] animation-delay-[400ms]"
                    style={{ animationDelay: '400ms' }}
                  />
                </div>
                <span
                  className="ml-4 font-semibold text-lg tracking-wide text-pink-600 opacity-90 animate-[fadeInText_1.5s_infinite_alternate]"
                  style={{ textShadow: '0 1px 8px #F9A8D422' }}
                >
                  B is thinking...
                </span>
              </div>

              {/* Custom keyframes injected via style tag */}
              <style>
                {`
                  @keyframes dotFade {
                    0% { opacity: 0.3; transform: scale(1); }
                    30% { opacity: 1; transform: scale(1.25); }
                    60% { opacity: 0.7; transform: scale(1); }
                    100% { opacity: 0.3; transform: scale(1); }
                  }
                  @keyframes fadeInText {
                    0% { opacity: 0.7; }
                    100% { opacity: 1; }
                  }
                `}
              </style>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ───── Chat Input Section ───── */}
      <div className="p-4">
        <div className="max-w-[60%] mx-auto">
          <ChatInputBar
            message={message}
            setMessage={setMessage}
            onSend={handleSendMessage}
            isDisabled={!message.trim()}
          />
        </div>
      </div>
    </div>
  );
};

export default Homer;
