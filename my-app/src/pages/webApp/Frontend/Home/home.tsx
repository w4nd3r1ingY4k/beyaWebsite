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

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
  const [error, setError] = useState<string | null>(null);

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

  // System prompt to define the assistant's behavior
  const systemPrompt: OpenAIMessage = {
    role: 'system',
    content: `You are B, a helpful business assistant that provides insights about business performance. 
    You should be conversational, helpful, and occasionally suggest showing charts or graphs when discussing metrics or trends.
    When the user asks about performance, metrics, or trends, you can mention that you could show them a graph.
    Keep responses concise and actionable.`
  };

  // Convert our messages to OpenAI format
  const convertToOpenAIMessages = (): OpenAIMessage[] => {
    const openAIMessages: OpenAIMessage[] = [systemPrompt];
    
    messages.forEach(msg => {
      openAIMessages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
    
    return openAIMessages;
  };

  // Call backend (Express on localhost:5000)
  const callOpenAI = async (userMessage: string): Promise<string> => {
    const openAIMessages = convertToOpenAIMessages();
    openAIMessages.push({ role: 'user', content: userMessage });

    console.log('Making request with messages:', openAIMessages);

    try {
      const response = await fetch('http://localhost:2074/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: openAIMessages,
          temperature: 0.7,
          max_tokens: 500,
          presence_penalty: 0.3,
          frequency_penalty: 0.3
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error response:', errorData);
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${
            (errorData as any).error?.message || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  };

  // Scroll to bottom whenever messages array changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Called when user clicks "send"
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newUserMsg: Message = {
      id: messages.length + 1,
      type: 'user',
      content: message.trim(),
    };

    setMessages(prev => [...prev, newUserMsg]);
    setMessage('');
    setIsTyping(true);
    setError(null);

    try {
      console.log('Calling backend API...');
      const aiResponse = await callOpenAI(newUserMsg.content);
      console.log('Received response:', aiResponse);
      
      // Determine if we should show a chart based on keywords in the response
      const chartKeywords = [
        'graph',
        'chart',
        'trend',
        'performance',
        'metrics',
        'growth',
        'increase',
        'decrease'
      ];
      const shouldShowChart = chartKeywords.some(keyword =>
        aiResponse.toLowerCase().includes(keyword)
      );

      const newAIMessage: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: aiResponse,
        hasChart: shouldShowChart && Math.random() < 0.5, // 50% chance if keywords present
      };

      setMessages(prev => [...prev, newAIMessage]);
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to get response. Please try again.';
      setError(errorMsg);
      console.error('Error details:', error);

      // Fallback message
      const errorMessage: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: `I'm having trouble connecting right now. Error: ${errorMsg}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '4vh',
        height: '96vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            padding: '12px 24px',
            margin: '16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#991B1B',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ───── Messages Container ───── */}
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
            maxWidth: 1024,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {messages.map(msg => {
            const isUser = msg.type === 'user';

            // User‐bubble style: darker pink border + light pink background
            const userBubbleStyle: React.CSSProperties = {
              border: '1px solid #DB2777',       // #DB2777 is a darker pink
              backgroundColor: '#FCE7F3',         // #FCE7F3 is a very light pink
              color: '#831843',                   // text in dark pink for contrast
              borderRadius: 24,
              padding: '16px 24px',
            };

            // Assistant (system) bubble style: no border, white background
            const assistantBubbleStyle: React.CSSProperties = {
              color: '#1F2937',                   // gray‐700 text
              borderRadius: 24,
              padding: '16px 24px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            };

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '768px',
                    ...(isUser ? { order: 2 } : {}),
                  }}
                >
                  <div style={isUser ? userBubbleStyle : assistantBubbleStyle}>
                    <p style={{ fontSize: '1.125rem', lineHeight: '1.75rem', margin: 0 }}>
                      {msg.content}
                    </p>

                    {msg.hasChart && (
                      <div style={{ marginTop: 24 }}>
                        {/* Time Period Selector */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                          <button
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#FCE7F3',   // light pink pill
                              color: '#831843',             // dark pink text
                              borderRadius: 9999,
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            1D
                          </button>
                          {['1W', '1M', '3M', '1Y'].map(label => (
                            <button
                              key={label}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                color: '#6B7280',         // gray‐500
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={e =>
                                ((e.currentTarget as HTMLButtonElement).style.color = '#374151')
                              }
                              onMouseLeave={e =>
                                ((e.currentTarget as HTMLButtonElement).style.color = '#6B7280')
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Chart */}
                        <div style={{ width: '100%', height: 256 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={false} />
                              <YAxis hide />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#EC4899"    // pink‐600
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
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>You</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: 24,
                  padding: '20px 36px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 6px 32px 0 rgba(31,41,55,0.10), 0 1.5px 4px 0 rgba(236,72,153,0.10)',
                  border: '1px solid #E5E7EB',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Subtle animated dots */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EC4899 60%, #F9A8D4 100%)',
                      opacity: 0.85,
                      animation: 'dotFade 1.2s infinite',
                      animationDelay: '0ms',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EC4899 60%, #F9A8D4 100%)',
                      opacity: 0.7,
                      animation: 'dotFade 1.2s infinite',
                      animationDelay: '200ms',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EC4899 60%, #F9A8D4 100%)',
                      opacity: 0.55,
                      animation: 'dotFade 1.2s infinite',
                      animationDelay: '400ms',
                      display: 'inline-block',
                    }}
                  />
                </div>
                <span
                  style={{
                    marginLeft: 18,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    letterSpacing: 0.2,
                    fontFamily: 'SF Pro Display, Inter, Arial, sans-serif',
                    opacity: 0.92,
                    textShadow: '0 1px 8px #F9A8D422',
                    animation: 'fadeInText 1.5s infinite alternate',
                  }}
                >
                  B is thinking...
                </span>
              </div>
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
      <div
        style={{
          padding: '16px',
        }}
      >
        <div style={{ maxWidth: '60%', margin: '0 auto' }}>
          <ChatInputBar
            message={message}
            setMessage={setMessage}
            onSend={handleSendMessage}
            isDisabled={!message.trim() || isTyping}
          />
        </div>
      </div>
    </div>
  );
};

export default Homer;