
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessionId: string;
  setSessionId: React.Dispatch<React.SetStateAction<string>>;
  speakText: (text: string) => Promise<void>;
}

const ChatBot: React.FC<ChatBotProps> = ({ messages, setMessages, sessionId, setSessionId, speakText }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('neuroheart-session-id');
    const storedMessages = localStorage.getItem('neuroheart-chat-history');
    
    if (storedSessionId && !sessionId) {
      setSessionId(storedSessionId);
    } else if (!sessionId) {
      const newSessionId = `user_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('neuroheart-session-id', newSessionId);
    }

    if (storedMessages && messages.length === 0) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Error parsing stored messages:', error);
      }
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
        toast.success('Voice input captured!');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Voice input failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [sessionId, messages.length, setSessionId, setMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('neuroheart-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: question.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setQuestion('');

    console.log("Sending request to n8n webhook:", {
      question: userMessage.text,
      sessionId
    });

    try {
      const response = await fetch('https://sreen8n.app.n8n.cloud/webhook/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.text,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received response from n8n:", data);

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        text: data.answer || data.response || data.message || 'Sorry, I could not generate a response.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      toast.success("Response received!");

    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get response from AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
      toast.info('Listening... Speak now!');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="flex-1 flex flex-col h-screen justify-between bg-gray-100 dark:bg-gray-900">
      <style>
        {`
          .chat-scrollbar::-webkit-scrollbar {
            width: 10px;
          }
          .chat-scrollbar::-webkit-scrollbar-track {
            background: #f3f4f6;
          }
          .dark .chat-scrollbar::-webkit-scrollbar-track {
            background: #1f2937;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 5px;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #374151;
          }
          .dark .chat-scrollbar::-webkit-scrollbar-thumb {
            background: #6b7280;
          }
          .dark .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .chat-scrollbar {
            scrollbar-width: thin;
          }
        `}
      </style>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto chat-scrollbar p-4 min-h-0">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Welcome to NeuroChat</h3>
              <p className="text-gray-500 dark:text-gray-400">Ask me anything and I'll help you find the answer!</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onCopy={copyToClipboard}
              onSpeak={speakText}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 max-w-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🤖</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 bg-gray-200 dark:bg-gray-800 flex-shrink-0">
        <Card className="border-blue-200 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-700">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex space-x-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="min-h-[60px] resize-none border-blue-200 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  variant={isListening ? "destructive" : "outline"}
                  className="h-auto px-3 py-3"
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 h-auto"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
