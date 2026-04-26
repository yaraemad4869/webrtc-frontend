import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Alert, Button, Modal } from 'react-bootstrap';
import { 
  FaMicrophone, FaMicrophoneSlash, 
  FaVideo, FaVideoSlash,
  FaPhoneSlash, FaRecordVinyl,
  FaStop, FaDownload
} from 'react-icons/fa';
import signalRService from '../services/signalRService';
import webrtcService from '../services/webrtcService';

const MeetingRoom = ({ meetingId, participantName, participantId, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [error, setError] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const localVideoRef = useRef();
  const remoteVideosRef = useRef({});
  const participantsRef = useRef({});

  useEffect(() => {
    initializeMeeting();
    return () => {
      signalRService.disconnect();
      webrtcService.closeAllConnections();
    };
  }, []);

  const initializeMeeting = async () => {
    try {
      await signalRService.startConnection();
      
      // Initialize local media
      const stream = await webrtcService.initializeLocalStream(true, true);
      localVideoRef.current.srcObject = stream;

      // Set up signal handlers
      signalRService.on('participantJoined', handleParticipantJoined);
      signalRService.on('participantLeft', handleParticipantLeft);
      signalRService.on('existingParticipants', handleExistingParticipants);
      signalRService.on('signal', handleSignal);
      signalRService.on('audioToggled', handleAudioToggled);
      signalRService.on('videoToggled', handleVideoToggled);
      signalRService.on('recordingAvailable', handleRecordingAvailable);

      // Join the meeting
      const success = await signalRService.joinMeeting(meetingId, participantName);
      if (!success) {
        setError('Failed to join meeting');
        setTimeout(() => onLeave(), 3000);
      }
    } catch (error) {
      console.error('Failed to initialize meeting:', error);
      setError('Failed to initialize meeting');
    }
  };

  const handleParticipantJoined = (participant) => {
    console.log('Participant joined:', participant);
    setParticipants(prev => [...prev, participant]);
    participantsRef.current[participant.id] = participant;
    createPeerConnection(participant.id);
  };

  const handleParticipantLeft = (participantId) => {
    console.log('Participant left:', participantId);
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    delete participantsRef.current[participantId];
    
    // Close peer connection
    const pc = webrtcService.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      webrtcService.peerConnections.delete(participantId);
    }
    
    // Remove remote video
    delete remoteVideosRef.current[participantId];
  };

  const handleExistingParticipants = (existingParticipants) => {
    console.log('Existing participants:', existingParticipants);
    setParticipants(existingParticipants);
    existingParticipants.forEach(p => {
      participantsRef.current[p.id] = p;
      createPeerConnection(p.id);
    });
  };

  const handleSignal = async (message) => {
    const { type, from, sdp, candidate } = message;

    try {
      switch (type) {
        case 'offer':
          const answer = await webrtcService.handleOffer(from, { type: 'offer', sdp });
          await signalRService.sendSignal(from, {
            type: 'answer',
            sdp: answer.sdp
          });
          break;

        case 'answer':
          await webrtcService.handleAnswer(from, { type: 'answer', sdp });
          break;

        case 'candidate':
          await webrtcService.handleIceCandidate(from, candidate);
          break;

        default:
          console.log('Unknown signal type:', type);
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  const handleAudioToggled = (participantId, enabled) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, isAudioEnabled: enabled } : p
    ));
  };

  const handleVideoToggled = (participantId, enabled) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, isVideoEnabled: enabled } : p
    ));
  };

  const handleRecordingAvailable = (recording) => {
    alert(`New recording available: ${recording.fileName}`);
  };

  const createPeerConnection = useCallback(async (targetParticipantId) => {
    const pc = webrtcService.createPeerConnection(
      targetParticipantId,
      (participantId, stream) => {
        // Handle remote stream
        const videoElement = remoteVideosRef.current[participantId];
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      },
      async (participantId, candidate) => {
        await signalRService.sendSignal(participantId, {
          type: 'candidate',
          candidate
        });
      }
    );

    // Create and send offer
    const offer = await webrtcService.createOffer(targetParticipantId);
    await signalRService.sendSignal(targetParticipantId, {
      type: 'offer',
      sdp: offer.sdp
    });
  }, []);

  const toggleAudio = async () => {
    const newState = !isAudioEnabled;
    webrtcService.toggleAudio(newState);
    setIsAudioEnabled(newState);
    await signalRService.toggleAudio(newState);
  };

  const toggleVideo = async () => {
    const newState = !isVideoEnabled;
    webrtcService.toggleVideo(newState);
    setIsVideoEnabled(newState);
    await signalRService.toggleVideo(newState);
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      webrtcService.startRecording();
      setIsRecording(true);
      setRecordingComplete(false);
    } else {
      const blob = await webrtcService.stopRecording();
      if (blob) {
        setRecordingBlob(blob);
        setRecordingComplete(true);
        
        // Auto-upload
        try {
          await webrtcService.uploadRecording(blob, meetingId, participantId);
          alert('Recording uploaded successfully');
        } catch (error) {
          console.error('Upload failed:', error);
          alert('Recording saved locally but upload failed. You can download it.');
        }
      }
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-${meetingId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const leaveMeeting = () => {
    webrtcService.closeAllConnections();
    signalRService.disconnect();
    onLeave();
  };

  return (
    <Container fluid className="p-0 vh-100 d-flex flex-column">
      {error && (
        <Alert variant="danger" className="m-3" dismissible>
          {error}
        </Alert>
      )}

      {isRecording && (
        <div className="recording-indicator">
          <span className="spinner-grow spinner-grow-sm" role="status" />
          Recording...
        </div>
      )}

      {recordingComplete && (
        <Alert variant="success" className="m-3">
          Recording complete! 
          <Button 
            variant="outline-success" 
            size="sm" 
            className="ms-2"
            onClick={downloadRecording}
          >
            <FaDownload /> Download
          </Button>
        </Alert>
      )}

      <div className="participants-grid">
        {/* Local video */}
        <div className="video-container">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="video-element"
          />
          <span className="participant-name">
            {participantName} (You)
            {!isAudioEnabled && <FaMicrophoneSlash className="ms-2 text-danger" />}
          </span>
        </div>

        {/* Remote videos */}
        {participants.map(participant => (
          <div key={participant.id} className="video-container">
            <video
              ref={el => remoteVideosRef.current[participant.id] = el}
              autoPlay
              playsInline
              className="video-element"
            />
            <span className="participant-name">
              {participant.name}
              {!participant.isAudioEnabled && <FaMicrophoneSlash className="ms-2 text-danger" />}
            </span>
          </div>
        ))}
      </div>

      <div className="control-bar">
        <button
          className={`control-button ${!isAudioEnabled ? 'danger' : ''}`}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button
          className={`control-button ${!isVideoEnabled ? 'danger' : ''}`}
          onClick={toggleVideo}
          title={isVideoEnabled ? 'Hide Video' : 'Show Video'}
        >
          {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>

        <button
          className={`control-button ${isRecording ? 'danger' : 'success'}`}
          onClick={toggleRecording}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? <FaStop /> : <FaRecordVinyl />}
        </button>

        <button
          className="control-button danger"
          onClick={() => setShowLeaveModal(true)}
          title="Leave Meeting"
        >
          <FaPhoneSlash />
        </button>
      </div>

      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Leave Meeting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to leave the meeting?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={leaveMeeting}>
            Leave
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MeetingRoom;