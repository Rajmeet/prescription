"use client";
import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface Message {
  text: string;
  sender: 'You' | 'Peer';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');
    setupWebRTC();

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupWebRTC = () => {
    peerConnection.current = new RTCPeerConnection();

    peerConnection.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    peerConnection.current.ondatachannel = (event: RTCDataChannelEvent) => {
      dataChannel.current = event.channel;
      setupDataChannel();
    };

    if (socketRef.current) {
      socketRef.current.on('offer', async (offer: RTCSessionDescriptionInit) => {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socketRef.current?.emit('answer', answer);
        }
      });

      socketRef.current.on('answer', (answer: RTCSessionDescriptionInit) => {
        if (peerConnection.current) {
          peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socketRef.current.on('ice-candidate', (candidate: RTCIceCandidateInit) => {
        if (peerConnection.current) {
          peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    }
  };

  const setupDataChannel = () => {
    if (dataChannel.current) {
      dataChannel.current.onopen = () => {
        setConnectionStatus('Connected');
      };

      dataChannel.current.onmessage = (event: MessageEvent) => {
        setMessages(prev => [...prev, { text: event.data, sender: 'Peer' }]);
      };
    }
  };

  const createOffer = async () => {
    if (peerConnection.current) {
      dataChannel.current = peerConnection.current.createDataChannel('messageChannel');
      setupDataChannel();

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socketRef.current?.emit('offer', offer);
    }
  };

  const sendMessage = () => {
    if (inputMessage && dataChannel.current?.readyState === 'open') {
      dataChannel.current.send(inputMessage);
      setMessages(prev => [...prev, { text: inputMessage, sender: 'You' }]);
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