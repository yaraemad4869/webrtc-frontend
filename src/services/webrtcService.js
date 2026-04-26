import RecordRTC from 'recordrtc';

class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.recorder = null;
    this.isRecording = false;
    this.recordedBlob = null;
  }

  async initializeLocalStream(audioEnabled = true, videoEnabled = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioEnabled,
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  createPeerConnection(participantId, onTrack, onIceCandidate) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(participantId, event.candidate);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}: ${peerConnection.connectionState}`);
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${participantId}: ${peerConnection.iceConnectionState}`);
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      onTrack(participantId, event.streams[0]);
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  async createOffer(participantId) {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) throw new Error('Peer connection not found');

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(participantId, offer) {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) throw new Error('Peer connection not found');

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(participantId, answer) {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) throw new Error('Peer connection not found');

    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(participantId, candidate) {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) throw new Error('Peer connection not found');

    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  startRecording() {
    if (!this.localStream) return;

    this.recorder = RecordRTC(this.localStream, {
      type: 'video',
      mimeType: 'video/webm',
      bitsPerSecond: 128000,
      recorderType: RecordRTC.MediaStreamRecorder
    });

    this.recorder.startRecording();
    this.isRecording = true;
    this.recordedBlob = null;
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.recorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.recorder.stopRecording(() => {
        this.recordedBlob = this.recorder.getBlob();
        this.isRecording = false;
        resolve(this.recordedBlob);
      });
    });
  }

  async uploadRecording(blob, meetingId, participantId) {
    const formData = new FormData();
    formData.append('file', blob, `recording-${Date.now()}.webm`);
    formData.append('meetingId', meetingId);
    formData.append('participantId', participantId);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:7000';
      const response = await fetch(`${apiUrl}/api/recording/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading recording:', error);
      throw error;
    }
  }

  closeAllConnections() {
    this.peerConnections.forEach((pc) => {
      if (pc.connectionState !== 'closed') {
        pc.close();
      }
    });
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.recorder) {
      this.recorder = null;
    }
    this.isRecording = false;
  }

  getAudioTracks() {
    return this.localStream?.getAudioTracks() || [];
  }

  getVideoTracks() {
    return this.localStream?.getVideoTracks() || [];
  }

  isAudioEnabled() {
    const tracks = this.getAudioTracks();
    return tracks.length > 0 && tracks[0].enabled;
  }

  isVideoEnabled() {
    const tracks = this.getVideoTracks();
    return tracks.length > 0 && tracks[0].enabled;
  }
}

export default new WebRTCService();