import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Cpu, Sparkles, User, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export default function GeminiChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHighThinking, setIsHighThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", text: inputValue.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          thinkingMode: isHighThinking,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages([...newMessages, { role: "model", text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...newMessages,
        { role: "model", text: `Error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-24 md:bottom-8 md:right-28 size-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50 cursor-pointer"
        title="Project Assistant"
      >
        <Sparkles className="size-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 md:right-28 w-[90vw] md:w-[400px] h-[500px] max-h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <Cpu className="size-5" />
                Project Assistant
              </div>
              <button
                onClick={toggleChat}
                className="hover:bg-indigo-700 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Config Toolbar */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Model Mode:</span>
              <button
                onClick={() => setIsHighThinking(!isHighThinking)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  isHighThinking
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : "bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300"
                }`}
                title={isHighThinking ? "High Thinking Enabled" : "Standard Speed"}
              >
                <BrainCircuit className="size-3" />
                {isHighThinking ? "High Thinking" : "Standard"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm italic mt-10">
                  How can I help you with your projects today?
                </div>
              )}
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {m.role === "model" ? (
                      <div className="markdown-body prose prose-sm max-w-none">
                         <ReactMarkdown>{m.text}</ReactMarkdown>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl p-3 text-sm bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm flex items-center gap-2">
                    <div className="size-2 bg-slate-400 rounded-full animate-pulse" />
                    <div className="size-2 bg-slate-400 rounded-full animate-pulse delay-75" />
                    <div className="size-2 bg-slate-400 rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about projects..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
