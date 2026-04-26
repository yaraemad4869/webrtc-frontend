import * as signalR from '@microsoft/signalr';

class SignalRService {
    constructor() {
        this.connection = null;
        this.listeners = {};
    }

    async startConnection() {
        // Make sure to use the correct URL - check if your backend is running on a different port
        const hubUrl = 'https://localhost:7000/meetingHub';

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        try {
            await this.connection.start();
            console.log('SignalR Connected');
            this.setupListeners();
        } catch (err) {
            console.error('SignalR Connection Error: ', err);
            // Retry after 5 seconds
            setTimeout(() => this.startConnection(), 5000);
        }
    }

    setupListeners() {
        this.connection.on('ParticipantJoined', (participant) => {
            if (this.listeners['participantJoined']) {
                this.listeners['participantJoined'](participant);
            }
        });

        this.connection.on('ParticipantLeft', (participantId) => {
            if (this.listeners['participantLeft']) {
                this.listeners['participantLeft'](participantId);
            }
        });

        this.connection.on('ExistingParticipants', (participants) => {
            if (this.listeners['existingParticipants']) {
                this.listeners['existingParticipants'](participants);
            }
        });

        this.connection.on('ReceiveSignal', (message) => {
            if (this.listeners['signal']) {
                this.listeners['signal'](message);
            }
        });

        this.connection.on('ParticipantAudioToggled', (participantId, enabled) => {
            if (this.listeners['audioToggled']) {
                this.listeners['audioToggled'](participantId, enabled);
            }
        });

        this.connection.on('ParticipantVideoToggled', (participantId, enabled) => {
            if (this.listeners['videoToggled']) {
                this.listeners['videoToggled'](participantId, enabled);
            }
        });

        this.connection.on('RecordingAvailable', (recording) => {
            if (this.listeners['recordingAvailable']) {
                this.listeners['recordingAvailable'](recording);
            }
        });

        this.connection.on('ReceiveMessage', (message) => {
            if (this.listeners['receiveMessage']) {
                this.listeners['receiveMessage'](message);
            }
        });
    }

    on(event, callback) {
        this.listeners[event] = callback;
    }

    async createMeeting(meetingName, userName) {
        try {
            return await this.connection.invoke('CreateMeeting', meetingName, userName);
        } catch (error) {
            console.error('Error creating meeting:', error);
            throw error;
        }
    }

    async joinMeeting(meetingId, userName) {
        try {
            return await this.connection.invoke('JoinMeeting', meetingId, userName);
        } catch (error) {
            console.error('Error joining meeting:', error);
            throw error;
        }
    }

    async sendSignal(targetParticipantId, message) {
        try {
            await this.connection.invoke('SendSignal', targetParticipantId, message);
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }

    async toggleAudio(enabled) {
        try {
            await this.connection.invoke('ToggleAudio', enabled);
        } catch (error) {
            console.error('Error toggling audio:', error);
        }
    }

    async toggleVideo(enabled) {
        try {
            await this.connection.invoke('ToggleVideo', enabled);
        } catch (error) {
            console.error('Error toggling video:', error);
        }
    }

    async sendMessage(meetingId, message) {
        try {
            await this.connection.invoke('SendMessage', meetingId, message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    disconnect() {
        if (this.connection) {
            this.connection.stop();
        }
    }
}

// Create and export a single instance
const signalRService = new SignalRService();
export default signalRService;