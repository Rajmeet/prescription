import { Socket } from 'socket.io-client';

interface Message {
    text: string;
    sender: 'You' | 'Peer';
}

export class WebRTCServer {
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private socket: Socket | null = null;
    private onMessageCallback: ((message: Message) => void) | null = null;
    private onStatusChangeCallback: ((status: 'Connected' | 'Disconnected') => void) | null = null;

    constructor(socket: Socket) {
        this.socket = socket;
        this.setupWebRTC();
    }

    private setupWebRTC() {
        this.peerConnection = new RTCPeerConnection();

        this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate && this.socket) {
                this.socket.emit('ice-candidate', event.candidate);
            }
        };

        this.peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };

        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection?.connectionState === 'connected') {
                this.onStatusChangeCallback?.('Connected');
            } else {
                this.onStatusChangeCallback?.('Disconnected');
            }
        };

        if (this.socket) {
            this.socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
                if (this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    this.socket?.emit('answer', answer);
                }
            });

            this.socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
                if (this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                }
            });

            this.socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                if (this.peerConnection) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });
        }
    }

    private setupDataChannel() {
        if (this.dataChannel) {
            this.dataChannel.onopen = () => {
                this.onStatusChangeCallback?.('Connected');
            };

            this.dataChannel.onclose = () => {
                this.onStatusChangeCallback?.('Disconnected');
            };

            this.dataChannel.onmessage = (event: MessageEvent) => {
                const message: Message = { text: event.data, sender: 'Peer' };
                this.onMessageCallback?.(message);
            };
        }
    }

    public async createOffer() {
        if (this.peerConnection) {
            this.dataChannel = this.peerConnection.createDataChannel('messageChannel');
            this.setupDataChannel();

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket?.emit('offer', offer);
        }
    }

    public sendMessage(message: string) {
        if (message && this.dataChannel?.readyState === 'open') {
            this.dataChannel.send(message);
            const sentMessage: Message = { text: message, sender: 'You' };
            this.onMessageCallback?.(sentMessage);
        }
    }

    public setOnMessageCallback(callback: (message: Message) => void) {
        this.onMessageCallback = callback;
    }

    public setOnStatusChangeCallback(callback: (status: 'Connected' | 'Disconnected') => void) {
        this.onStatusChangeCallback = callback;
    }

    public close() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}