import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.listeners = {};
    this.isConnected = false;
  }
  // Add these methods to the existing SignalRService class

  async sendMessage(meetingId, message) {
    await this.connection.invoke('SendMessage', meetingId, message);
  }
  async startConnection() {
    const url = process.env.REACT_APP_SIGNALR_URL || ' https://localhost:7000/meetingHub';

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        withCredentials: true
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();


    this.connection.onreconnecting((error) => {
      console.log('Reconnecting...', error);
      this.isConnected = false;
    });

    this.connection.onreconnected((connectionId) => {
      console.log('Reconnected', connectionId);
      this.isConnected = true;
    });

    this.connection.onclose((error) => {
      console.log('Connection closed', error);
      this.isConnected = false;
    });

    try {
      await this.connection.start();
      console.log('SignalR Connected');
      this.isConnected = true;
      this.setupListeners();
    } catch (err) {
      console.error('SignalR Connection Error: ', err);
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

    // Add this to setupListeners method
    this.connection.on('ReceiveMessage', (message) => {
      if (this.listeners['receiveMessage']) {
        this.listeners['receiveMessage'](message);
      }
    });
  }
  on(event, callback) {
    this.listeners[event] = callback;
  }

  off(event) {
    delete this.listeners[event];
  }

  async createMeeting(meetingName, userName) {
    if (!this.isConnected) await this.startConnection();
    return await this.connection.invoke('CreateMeeting', meetingName, userName);
  }

  async joinMeeting(meetingId, userName) {
    if (!this.isConnected) await this.startConnection();
    return await this.connection.invoke('JoinMeeting', meetingId, userName);
  }

  async sendSignal(targetParticipantId, message) {
    if (!this.isConnected) return;
    await this.connection.invoke('SendSignal', targetParticipantId, message);
  }

  async toggleAudio(enabled) {
    if (!this.isConnected) return;
    await this.connection.invoke('ToggleAudio', enabled);
  }

  async toggleVideo(enabled) {
    if (!this.isConnected) return;
    await this.connection.invoke('ToggleVideo', enabled);
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop();
      this.isConnected = false;
    }
  }
}

export default new SignalRService();