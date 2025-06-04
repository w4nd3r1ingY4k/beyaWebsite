import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Send, Plus, Mic, ArrowUp } from 'lucide-react';

const Homer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<
    Array<{
      id: number;
      type: 'user' | 'assistant';
      content: string;
      hasChart?: boolean;
    }>
  >([
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Auto-responses for AI
  const aiResponses = [
    "Great question! Let me analyze that for you. Based on the current data, I can see a positive trend in your business performance.",
    "I've compared today's performance with last Sunday's data. You're showing a 15% improvement in key metrics!",
    "Looking at the weekly overview, your peak performance times are between 2-5 PM. Would you like me to break down the specific factors contributing to this?",
    "I can help you optimize your business strategy. What specific aspect would you like to focus on - revenue, customer engagement, or operational efficiency?",
    "Based on your historical data, I predict continued growth of 3-5% over the next week if current trends continue.",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newUserMessage = {
        id: messages.length + 1,
        type: 'user' as const,
        content: message,
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setMessage('');
      setIsTyping(true);

      setTimeout(() => {
        const randomResponse =
          aiResponses[Math.floor(Math.random() * aiResponses.length)];
        const newAIMessage = {
          id: messages.length + 2,
          type: 'assistant' as const,
          content: randomResponse,
        };
        setMessages((prev) => [...prev, newAIMessage]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div
      style={{
        marginTop: '4vh',
        height: '96vh',
        backgroundColor: '#F9FAFB', // gray-50
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            maxWidth: 1024, // approximates max-w-4xl
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 24, // space-y-6
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent:
                  msg.type === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '768px', // approximates max-w-3xl
                  ...(msg.type === 'user' ? { order: 2 } : {}),
                }}
              >
                <div
                  style={{
                    borderRadius: 24, // rounded-2xl
                    padding: '16px 24px', // py-4 px-6
                    backgroundColor:
                      msg.type === 'user' ? '#DF1780' : '#FFFFFF', // brandPink or white
                    color: msg.type === 'user' ? '#FFFFFF' : '#1F2937', // white or gray-700
                    boxShadow:
                      msg.type === 'assistant'
                        ? '0 1px 2px rgba(0,0,0,0.05)'
                        : undefined, // shadow-sm if assistant
                  }}
                >
                  <p
                    style={{
                      fontSize: '1.125rem', // text-lg
                      lineHeight: '1.75rem', // leading-relaxed
                      margin: 0,
                    }}
                  >
                    {msg.content}
                  </p>

                  {msg.hasChart && (
                    <div style={{ marginTop: 24 /* mt-6 */ }}>
                      {/* Time Period Selector */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 8, // gap-2
                          marginBottom: 24, // mb-6
                        }}
                      >
                        <button
                          style={{
                            padding: '8px 16px', // px-4 py-2
                            backgroundColor: '#FCE7F3', // pink-200
                            color: '#831843', // pink-800
                            borderRadius: 9999, // rounded-full
                            fontSize: '0.875rem', // text-sm
                            fontWeight: 500, // font-medium
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          1D
                        </button>
                        <button
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#6B7280', // gray-500
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#374151') // gray-700
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#6B7280')
                          }
                        >
                          1W
                        </button>
                        <button
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#6B7280',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#374151')
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#6B7280')
                          }
                        >
                          1M
                        </button>
                        <button
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#6B7280',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#374151')
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#6B7280')
                          }
                        >
                          3M
                        </button>
                        <button
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#6B7280',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#374151')
                          }
                          onMouseLeave={(e) =>
                            ((e.target as HTMLButtonElement).style.color =
                              '#6B7280')
                          }
                        >
                          1Y
                        </button>
                      </div>

                      {/* Chart */}
                      <div
                        style={{
                          width: '100%',
                          height: 256, // h-64 = 16rem = 256px
                        }}
                      >
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
                              stroke="#EC4899" // pink-600
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

                {msg.type === 'user' && (
                  <div
                    style={{
                      marginTop: 8, // mt-2
                      textAlign: 'right',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.875rem', // text-sm
                        color: '#6B7280', // gray-500
                      }}
                    >
                      You
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF', // white
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)', // shadow-sm
                  borderRadius: 24, // rounded-2xl
                  padding: '16px 24px', // py-4 px-6
                  display: 'flex',
                  gap: 8, // space-x-2
                }}
              >
                <div
                  style={{
                    width: 8, // w-2
                    height: 8, // h-2
                    backgroundColor: '#9CA3AF', // gray-400
                    borderRadius: '50%',
                    animation: 'bounce 1.5s infinite alternate',
                    animationDelay: '0ms',
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: '#9CA3AF',
                    borderRadius: '50%',
                    animation: 'bounce 1.5s infinite alternate',
                    animationDelay: '150ms',
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: '#9CA3AF',
                    borderRadius: '50%',
                    animation: 'bounce 1.5s infinite alternate',
                    animationDelay: '300ms',
                  }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input Section */}
      <div
        style={{
          borderTop: '1px solid #E5E7EB', // gray-200
          backgroundColor: '#FFFFFF',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12, // gap-3
            }}
          >
            {/* Add Button */}
            <button
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                backgroundColor: '#F3F4F6', // gray-100
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor =
                  '#E5E7EB') // gray-200
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor =
                  '#F3F4F6')
              }
            >
              <Plus
                style={{ width: 20, height: 20, color: '#4B5563' /* gray-600 */ }}
              />
            </button>

            {/* Input Field */}
            <div
              style={{
                flex: 1,
                position: 'relative',
              }}
            >
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="How can I help you?"
                style={{
                  width: '100%',
                  padding: '12px 16px', // px-4 py-3
                  border: '1px solid #E5E7EB', // gray-200
                  borderRadius: 24, // rounded-2xl
                  resize: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  color: '#374151', // gray-700
                }}
                rows={1}
              />
            </div>

            {/* Voice Button */}
            <button
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                backgroundColor: '#F3F4F6',
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor =
                  '#E5E7EB')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor =
                  '#F3F4F6')
              }
            >
              <Mic
                style={{ width: 20, height: 20, color: '#4B5563' /* gray-600 */ }}
              />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: message.trim() ? 'pointer' : 'default',
                backgroundColor: message.trim() ? '#DF1780' : '#F3F4F6',
                color: message.trim() ? '#FFFFFF' : '#4B5563',
              }}
              onMouseEnter={(e) => {
                if (message.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    '#C41670'; // darker pink
                } else {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    '#E5E7EB'; // gray-200
                }
              }}
              onMouseLeave={(e) => {
                if (message.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    '#DF1780';
                } else {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    '#F3F4F6';
                }
              }}
            >
              <ArrowUp style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homer;