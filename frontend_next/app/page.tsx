"use client";
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { WebRTCServer } from '@/lib/web_rtc_server';

interface Message {
  text: string;
  sender: 'You' | 'Peer';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');

  const webRTCServerRef = useRef<WebRTCServer | null>(null);

  useEffect(() => {
    const socket = io('http://localhost:3000');
    webRTCServerRef.current = new WebRTCServer(socket);

    webRTCServerRef.current.setOnMessageCallback((message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    webRTCServerRef.current.setOnStatusChangeCallback((status: 'Connected' | 'Disconnected') => {
      setConnectionStatus(status);
    });

    return () => {
      if (webRTCServerRef.current) {
        webRTCServerRef.current.close();
      }
    };
  }, []);

  const createOffer = async () => {
    if (webRTCServerRef.current) {
      await webRTCServerRef.current.createOffer();
    }
  };

  const sendMessage = () => {
    if (inputMessage && webRTCServerRef.current) {
      webRTCServerRef.current.sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">WebRTC Messaging with Next.js and Tailwind</h1>
      <p className="mb-4">Connection Status:
        <span className={`ml-2 px-2 py-1 rounded ${connectionStatus === 'Connected' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          {connectionStatus}
        </span>
      </p>
      <button
        onClick={createOffer}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors mb-4"
      >
        Create Offer
      </button>
      <div className="bg-gray-100 h-96 overflow-y-auto mb-4 p-4 rounded-lg">
        {messages.map((msg, index) => (
          <p key={index} className={`mb-2 p-2 rounded-lg ${msg.sender === 'You' ? 'bg-blue-200 text-right' : 'bg-green-200'
            }`}>
            <strong>{msg.sender}:</strong> {msg.text}
          </p>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={inputMessage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow mr-2 p-2 border rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}