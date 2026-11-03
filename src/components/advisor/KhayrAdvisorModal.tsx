/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { siteConfig } from '../../config/site';
import {
  processAssistantQuery,
  AssistantProductCard,
  AssistantReply,
} from '../../services/assistantService';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { formatPKR } from '../../utils/ecommerce-logic';
import { formatProductMessage, buildWhatsAppUrl, toAbsoluteUrl } from '../../lib/whatsapp';
import { Sparkles, X, Send, Bot, ExternalLink, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  products?: AssistantProductCard[];
  actionLink?: {
    label: string;
    url: string;
  };
  showWhatsAppButton?: boolean;
  whatsAppPrompt?: string;
}

export const KhayrAdvisorModal: React.FC = () => {
  const { isAdvisorOpen, setIsAdvisorOpen, activeProducts, activeCategories } = useStore();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Assalam-o-Alaikum! Welcome to BARVAKA. I am your store assistant. You can ask me about product prices, sizing, stock availability, or delivery.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = [
    'Browse categories',
    'Delivery and payment',
    'Gifts under Rs. 3,000',
    'Track my order',
    'Talk on WhatsApp',
  ];

  // Scroll to bottom when messages or typing status change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input and handle Escape key for accessibility
  useEffect(() => {
    if (!isAdvisorOpen) return;

    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAdvisorOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdvisorOpen, setIsAdvisorOpen]);

  if (!isAdvisorOpen) return null;

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isTyping) return;

    // Throttle to 1 message per second
    const now = Date.now();
    if (now - lastSentTime < 1000) return;
    setLastSentTime(now);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend.slice(0, 300),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Process query client-side against public store data
      const reply: AssistantReply = await processAssistantQuery(textToSend, {
        products: activeProducts,
        categories: activeCategories,
      });

      // Typing indicator delay of 400ms
      setTimeout(() => {
        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: reply.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          products: reply.products,
          actionLink: reply.actionLink,
          showWhatsAppButton: reply.showWhatsAppButton,
          whatsAppPrompt: reply.whatsAppPrompt,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
      }, 400);
    } catch {
      setTimeout(() => {
        const fallbackMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: `For immediate personal assistance, please message our team on WhatsApp at ${siteConfig.support.whatsappDisplay}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showWhatsAppButton: true,
          whatsAppPrompt: `Hello BARVAKA, I have an inquiry about your store.`,
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setIsTyping(false);
      }, 400);
    }
  };

  const handleNavigateProduct = (slug: string) => {
    setIsAdvisorOpen(false);
    navigate(`/product/${slug}`);
  };

  const handleActionLink = (url: string) => {
    setIsAdvisorOpen(false);
    navigate(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[#FBF5EC] rounded-[24px] shadow-2xl border border-[#E3D5C4] w-full max-w-lg flex flex-col h-[600px] max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#3B2A20] text-[#F3E9DC] flex items-center justify-between border-b border-[#6B5B50]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#8A9A7B]/20 border border-[#8A9A7B]/40 flex items-center justify-center text-[#DDE3D3]">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 id="assistant-modal-title" className="font-serif font-bold text-base text-[#F3E9DC]">
                BARVAKA assistant
              </h3>
              <p className="text-[11px] text-[#F3E9DC]/80">
                Instant answers from our store catalog &amp; delivery desk
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAdvisorOpen(false)}
            aria-label="Close Assistant"
            className="p-2 min-h-[44px] min-w-[44px] rounded-full text-[#F3E9DC] hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Message Stream */}
        <div
          aria-live="polite"
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F3E9DC]/40"
        >
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[90%] sm:max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-[#3B2A20] text-[#F3E9DC] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} />
                  </div>
                )}
                <div className="space-y-2.5 w-full">
                  <div
                    className={`p-3.5 rounded-[16px] text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#B4502F] text-white'
                        : 'bg-[#FBF5EC] text-[#3B2A20] border border-[#E3D5C4]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <span
                      className={`block text-[10px] mt-1.5 ${
                        isUser ? 'text-white/80 text-right' : 'text-[#6B5B50]'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Compact Product Result Cards */}
                  {m.products && m.products.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {m.products.map((prod) => {
                        const whatsAppMsg = formatProductMessage({
                          product: {
                            name: prod.name,
                            slug: prod.slug,
                            images: [prod.image_url],
                            base_price: prod.price,
                          },
                          quantity: 1,
                        });
                        const whatsAppUrl = buildWhatsAppUrl(whatsAppMsg);

                        return (
                          <div
                            key={prod.id}
                            className="bg-[#FBF5EC] border border-[#E3D5C4] rounded-[16px] p-2.5 flex items-center gap-3 shadow-xs hover:border-[#8A9A7B] transition-colors"
                          >
                            <div className="w-14 h-14 rounded-[12px] bg-[#DDE3D3] overflow-hidden shrink-0 border border-[#E3D5C4]">
                              <ImageWithFallback
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-[#3B2A20] truncate">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-serif font-bold text-xs text-[#B4502F]">
                                  {formatPKR(prod.price)}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    prod.stockStatus === 'out_of_stock'
                                      ? 'bg-[#B3372F]/15 text-[#B3372F]'
                                      : prod.stockStatus === 'low_stock'
                                      ? 'bg-[#C98A12]/15 text-[#C98A12]'
                                      : 'bg-[#8A9A7B]/20 text-[#3B2A20]'
                                  }`}
                                >
                                  {prod.stockLabel}
                                </span>
                              </div>
                              {prod.variantsSummary && (
                                <p className="text-[10px] text-[#6B5B50] truncate mt-0.5">
                                  {prod.variantsSummary}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => handleNavigateProduct(prod.slug)}
                                  className="text-[11px] font-semibold text-[#3B2A20] hover:text-[#B4502F] flex items-center gap-1 min-h-[36px] py-1 px-2.5 rounded-full border border-[#3B2A20]/30 hover:border-[#B4502F] transition-colors cursor-pointer"
                                >
                                  <span>View product</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                                <a
                                  href={whatsAppUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] flex items-center gap-1 min-h-[36px] py-1 px-2.5 rounded-full shadow-xs transition-colors cursor-pointer"
                                >
                                  <WhatsAppIcon className="w-3 h-3 text-white" />
                                  <span>Order on WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Link Button */}
                  {m.actionLink && (
                    <button
                      type="button"
                      onClick={() => handleActionLink(m.actionLink!.url)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#964225] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{m.actionLink.label}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Direct WhatsApp Fallback/Talk Button */}
                  {m.showWhatsAppButton && (
                    <div>
                      <a
                        href={buildWhatsAppUrl(m.whatsAppPrompt || 'Hello BARVAKA, I need help.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-white" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator (400ms) */}
          {isTyping && (
            <div className="flex gap-2.5 max-w-[85%] mr-auto">
              <div className="w-7 h-7 rounded-full bg-[#3B2A20] text-[#F3E9DC] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} />
              </div>
              <div className="p-3.5 rounded-[16px] bg-[#FBF5EC] text-[#6B5B50] border border-[#E3D5C4] text-xs flex items-center gap-2 shadow-xs">
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B4502F] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B4502F] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B4502F] animate-bounce [animation-delay:0.4s]" />
                </span>
                <span>BARVAKA assistant is typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-[#F3E9DC] border-t border-[#E3D5C4] overflow-x-auto flex gap-2">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="text-xs bg-[#FBF5EC] text-[#3B2A20] hover:bg-[#8A9A7B]/20 border border-[#E3D5C4] rounded-full px-3.5 py-2 min-h-[44px] shrink-0 transition-colors text-left font-medium cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* User Input Bar */}
        <div className="p-3 bg-[#FBF5EC] border-t border-[#E3D5C4] flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            maxLength={300}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask about prices, sizes, stock, or delivery..."
            className="flex-1 px-4 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="p-2.5 min-h-[44px] min-w-[44px] bg-[#B4502F] hover:bg-[#964225] disabled:opacity-50 text-white rounded-full transition-colors shadow-xs flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
