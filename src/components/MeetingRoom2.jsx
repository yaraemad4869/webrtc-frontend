import React, { useState, useEffect, useRef } from 'react';
import signalRService from '../services/signalRService2';
import webrtcService from '../services/webrtcService2';

export const MeetingRoom = ({ meetingId, participantName, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participantId, setParticipantId] = useState(null);

  const localVideoRef = useRef();
  const videoContainersRef = useRef({});
  const chatContainerRef = useRef();

  useEffect(() => {
    initializeMeeting();
    return () => {
      webrtcService.closeAllConnections();
      signalRService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeMeeting = async () => {
    try {
      await signalRService.startConnection();

      // Initialize local media
      const stream = await webrtcService.initializeLocalStream(true, true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set up signal handlers
      signalRService.on('participantJoined', handleParticipantJoined);
      signalRService.on('participantLeft', handleParticipantLeft);
      signalRService.on('existingParticipants', handleExistingParticipants);
      signalRService.on('signal', handleSignal);
      signalRService.on('audioToggled', handleAudioToggled);
      signalRService.on('videoToggled', handleVideoToggled);
      signalRService.on('recordingAvailable', handleRecordingAvailable);
      signalRService.on('receiveMessage', handleReceiveMessage);

      // Join the meeting
      const success = await signalRService.joinMeeting(meetingId, participantName);
      if (!success) {
        alert('Failed to join meeting');
        onLeave();
      }
    } catch (error) {
      console.error('Failed to initialize meeting:', error);
      alert('Failed to initialize meeting. Please try again.');
    }
  };

  const handleParticipantJoined = (participant) => {
    setParticipants(prev => [...prev, participant]);
    // Store the first participant's ID as our own ID
    if (!participantId) {
      setParticipantId(participant.id);
    }
    createPeerConnection(participant.id);
    addSystemMessage(`${participant.name} joined the meeting`);
  };

  const handleParticipantLeft = (leftParticipantId) => {
    const participant = participants.find(p => p.id === leftParticipantId);
    setParticipants(prev => prev.filter(p => p.id !== leftParticipantId));
    webrtcService.peerConnections.get(leftParticipantId)?.close();
    webrtcService.peerConnections.delete(leftParticipantId);

    const videoContainer = videoContainersRef.current[leftParticipantId];
    if (videoContainer) {
      videoContainer.srcObject = null;
    }

    if (participant) {
      addSystemMessage(`${participant.name} left the meeting`);
    }
  };

  const handleExistingParticipants = (existingParticipants) => {
    setParticipants(existingParticipants);
    existingParticipants.forEach(p => {
      // Don't create peer connection for ourselves
      if (p.id !== participantId) {
        createPeerConnection(p.id);
      }
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

  const handleAudioToggled = (toggledParticipantId, enabled) => {
    setParticipants(prev => prev.map(p =>
      p.id === toggledParticipantId ? { ...p, isAudioEnabled: enabled } : p
    ));
  };

  const handleVideoToggled = (toggledParticipantId, enabled) => {
    setParticipants(prev => prev.map(p =>
      p.id === toggledParticipantId ? { ...p, isVideoEnabled: enabled } : p
    ));
  };

  const handleRecordingAvailable = (recording) => {
    addSystemMessage(`New recording available: ${recording.fileName}`);
  };

  const handleReceiveMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const createPeerConnection = async (targetParticipantId) => {
    try {
      const pc = webrtcService.createPeerConnection(
        targetParticipantId,
        (participantId, stream) => {
          setRemoteStreams(prev => new Map(prev.set(participantId, stream)));

          const videoContainer = videoContainersRef.current[participantId];
          if (videoContainer) {
            videoContainer.srcObject = stream;
          }
        },
        async (participantId, candidate) => {
          await signalRService.sendSignal(participantId, {
            type: 'candidate',
            candidate
          });
        }
      );

      const offer = await webrtcService.createOffer(targetParticipantId);
      await signalRService.sendSignal(targetParticipantId, {
        type: 'offer',
        sdp: offer.sdp
      });
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

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
      addSystemMessage('Recording started');
    } else {
      const blob = await webrtcService.stopRecording();
      if (blob && participantId) {
        try {
          await webrtcService.uploadRecording(blob, meetingId, participantId);
          addSystemMessage('Recording uploaded successfully');
        } catch (error) {
          addSystemMessage('Failed to upload recording');
          console.error('Upload error:', error);
        }
      }
      setIsRecording(false);
    }
  };

  const addSystemMessage = (content) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'system',
      content,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !participantId) return;

    const message = {
      id: Date.now(),
      type: 'user',
      sender: participantName,
      senderId: participantId,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    await signalRService.sendMessage(meetingId, message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const setRemoteStreams = (streams) => {
    // This is just to trigger re-renders
  };

  return (
    <div className="meeting-room">
      {/* Control Bar */}
      <div className="control-bar bg-dark text-white p-3 mb-3 rounded">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5>Meeting: {meetingId}</h5>
            <small>Participants: {participants.length + 1}</small>
          </div>
          <div className="d-flex gap-2">
            <button
              className={`btn ${isAudioEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleAudio}
            >
              <i className={`bi ${isAudioEnabled ? 'bi-mic' : 'bi-mic-mute'}`}></i>
              {isAudioEnabled ? ' Mute' : ' Unmute'}
            </button>
            <button
              className={`btn ${isVideoEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleVideo}
            >
              <i className={`bi ${isVideoEnabled ? 'bi-camera-video' : 'bi-camera-video-off'}`}></i>
              {isVideoEnabled ? ' Stop Video' : ' Start Video'}
            </button>
            <button
              className={`btn ${isRecording ? 'btn-danger' : 'btn-warning'}`}
              onClick={toggleRecording}
            >
              <i className={`bi ${isRecording ? 'bi-record-circle' : 'bi-circle'}`}></i>
              {isRecording ? ' Stop Recording' : ' Start Recording'}
            </button>
            <button
              className="btn btn-info"
              onClick={() => setShowChat(!showChat)}
            >
              <i className="bi bi-chat"></i>
              Chat
            </button>
            <button
              className="btn btn-danger"
              onClick={onLeave}
            >
              <i className="bi bi-box-arrow-right"></i>
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="row">
        {/* Video Grid */}
        <div className={`col-${showChat ? '9' : '12'}`}>
          <div className="video-grid">
            <div className="row">
              {/* Local Video */}
              <div className="col-md-4 mb-3">
                <div className="video-container position-relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-100 rounded"
                    style={{ backgroundColor: '#2d2d2d' }}
                  />
                  <div className="position-absolute bottom-0 start-0 bg-dark text-white p-1 rounded">
                    {participantName} (You)
                    {!isAudioEnabled && <i className="bi bi-mic-mute ms-2 text-danger"></i>}
                  </div>
                </div>
              </div>

              {/* Remote Videos */}
              {participants.map(participant => (
                <div key={participant.id} className="col-md-4 mb-3">
                  <div className="video-container position-relative">
                    <video
                      ref={el => videoContainersRef.current[participant.id] = el}
                      autoPlay
                      playsInline
                      className="w-100 rounded"
                      style={{ backgroundColor: '#2d2d2d' }}
                    />
                    <div className="position-absolute bottom-0 start-0 bg-dark text-white p-1 rounded">
                      {participant.name}
                      {!participant.isAudioEnabled && <i className="bi bi-mic-mute ms-2 text-danger"></i>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {participants.length === 0 && (
                <div className="col-12 text-center p-5">
                  <h4>Waiting for others to join...</h4>
                  <p>Share this meeting ID: <strong>{meetingId}</strong></p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="col-3">
            <div className="chat-panel bg-light rounded p-3" style={{ height: '500px' }}>
              <h5>Chat Messages</h5>
              <div
                ref={chatContainerRef}
                className="chat-messages mb-3"
                style={{ height: '380px', overflowY: 'auto' }}
              >
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`message mb-2 p-2 rounded ${message.type === 'system' ? 'bg-warning' : 'bg-white'
                      }`}
                  >
                    {message.type === 'user' && (
                      <strong>{message.sender}: </strong>
                    )}
                    <span>{message.content}</span>
                    <small className="text-muted d-block">
                      {message.timestamp}
                    </small>
                  </div>
                ))}
              </div>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};