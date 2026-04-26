class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.onRecordingTimeUpdate = null;
  }

  // ==================== Media Device Management ====================

  async initializeLocalStream(audioEnabled = true, videoEnabled = true, videoDeviceId = null, audioDeviceId = null) {
    try {
      const constraints = {
        audio: audioEnabled ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false,
        video: videoEnabled ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }) : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInput: devices.filter(device => device.kind === 'audioinput'),
        audioOutput: devices.filter(device => device.kind === 'audiooutput'),
        videoInput: devices.filter(device => device.kind === 'videoinput')
      };
    } catch (error) {
      console.error('Error getting devices:', error);
      throw error;
    }
  }

  async switchCamera(deviceId) {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      this.localStream.addTrack(newVideoTrack);

      // Update all peer connections with the new track
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      });

      return newVideoTrack;
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }

  async switchMicrophone(deviceId) {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.stop();
      this.localStream.removeTrack(audioTrack);
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      this.localStream.addTrack(newAudioTrack);

      // Update all peer connections with the new track
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) {
          sender.replaceTrack(newAudioTrack);
        }
      });

      return newAudioTrack;
    } catch (error) {
      console.error('Error switching microphone:', error);
      throw error;
    }
  }

  // ==================== Peer Connection Management ====================

  createPeerConnection(participantId, onTrack, onIceCandidate, onConnectionStateChange) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
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

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      onTrack(participantId, event.streams[0]);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (onConnectionStateChange) {
        onConnectionStateChange(participantId, peerConnection.connectionState);
      }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${participantId}:`, peerConnection.iceConnectionState);
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

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // ==================== Media Controls ====================

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

  isAudioEnabled() {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? audioTrack.enabled : false;
  }

  isVideoEnabled() {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return videoTrack ? videoTrack.enabled : false;
  }

  // ==================== Screen Sharing ====================

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const videoTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle when user stops sharing
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];

    // Restore camera video track
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });
  }

  // ==================== Recording ====================

  startRecording(onDataAvailable) {
    if (!this.localStream) return;

    this.recordedChunks = [];
    this.recordingStartTime = Date.now();

    // Find the best supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm'
    ];

    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    const options = selectedMimeType ? { mimeType: selectedMimeType } : {};

    this.mediaRecorder = new MediaRecorder(this.localStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
        if (onDataAvailable) {
          onDataAvailable(event.data);
        }
      }
    };

    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    };

    // Start recording with timeslice for continuous data
    this.mediaRecorder.start(1000); // Collect data every second
    this.isRecording = true;

    // Start timer for recording duration
    if (this.onRecordingTimeUpdate) {
      this.recordingTimer = setInterval(() => {
        const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.onRecordingTimeUpdate(duration);
      }, 1000);
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder.mimeType || 'video/webm'
        });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  pauseRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
    }
  }

  getRecordingDuration() {
    if (!this.recordingStartTime || !this.isRecording) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  setRecordingTimeUpdateCallback(callback) {
    this.onRecordingTimeUpdate = callback;
  }

  // ==================== Upload ====================

  async uploadRecording(blob, meetingId) {
    const formData = new FormData();

    const fileName = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    const file = new File([blob], fileName, { type: blob.type || 'video/webm' });

    formData.append('file', file);
    formData.append('meetingId', meetingId);

    try {
      const response = await fetch('https://localhost:7000/api/recordings/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const result = await response.json();
      console.log('Recording uploaded successfully:', result);
      return result;
    } catch (error) {
      console.error('Error uploading recording:', error);
      throw error;
    }
  }

  // ==================== Recording Playback ====================

  getRecordingUrl(recordingId) {
    return `https://localhost:7000/api/recordings/${recordingId}`;
  }

  getStreamUrl(recordingId) {
    return `https://localhost:7000/api/recordings/stream/${recordingId}`;
  }

  getHlsUrl(recordingId) {
    return `https://localhost:7000/api/recordings/hls/${recordingId}`;
  }

  getDownloadUrl(recordingId) {
    return `https://localhost:7000/api/recordings/download/${recordingId}`;
  }

  getThumbnailUrl(recordingId) {
    return `https://localhost:7000/api/recordings/thumbnail/${recordingId}`;
  }

  async streamRecording(recordingId, videoElement, options = {}) {
    try {
      const { useHls = false, autoPlay = true, controls = true } = options;

      // Set video element properties
      videoElement.controls = controls;
      videoElement.crossOrigin = 'anonymous';

      if (useHls && Hls.isSupported()) {
        // Use HLS for adaptive streaming
        const hlsUrl = this.getHlsUrl(recordingId);

        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true
          });

          hls.loadSource(hlsUrl);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (autoPlay) {
              videoElement.play().catch(e => console.log('Autoplay prevented:', e));
            }
          });

          // Store hls instance for cleanup
          videoElement._hls = hls;
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // For Safari
          videoElement.src = hlsUrl;
        }
      } else {
        // Use regular streaming with range support
        const streamUrl = this.getStreamUrl(recordingId);
        videoElement.src = streamUrl;

        // Add range request headers for better streaming
        videoElement.addEventListener('loadedmetadata', () => {
          if (autoPlay) {
            videoElement.play().catch(e => console.log('Autoplay prevented:', e));
          }
        });
      }

      // Load the video
      videoElement.load();

    } catch (error) {
      console.error('Error streaming recording:', error);
      throw error;
    }
  }

  async getRecordingMetadata(recordingId) {
    try {
      const response = await fetch(`${this.getRecordingUrl(recordingId)}/metadata`);
      if (!response.ok) throw new Error('Failed to get metadata');
      return await response.json();
    } catch (error) {
      console.error('Error getting recording metadata:', error);
      throw error;
    }
  }

  async getRecordingThumbnail(recordingId) {
    try {
      const response = await fetch(`${this.getRecordingUrl(recordingId)}/thumbnail`);
      if (!response.ok) throw new Error('Failed to get thumbnail');
      return await response.json();
    } catch (error) {
      console.error('Error getting recording thumbnail:', error);
      throw error;
    }
  }

  async downloadRecording(recordingId) {
    try {
      const response = await fetch(this.getDownloadUrl(recordingId));
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${recordingId}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading recording:', error);
      throw error;
    }
  }

  // ==================== Cleanup ====================

  closeAllConnections() {
    // Close all peer connections
    this.peerConnections.forEach((pc) => {
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      pc.close();
    });
    this.peerConnections.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    // Stop recording if active
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    // Clear recording timer
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }
}

export default new WebRTCService();