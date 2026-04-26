import React, { useState } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { FaVideo, FaRecordVinyl } from 'react-icons/fa';
import MeetingRoom from './components/MeetingRoom';
import JoinMeeting from './components/JoinMeeting';
import CreateMeeting from './components/CreateMeeting';
import RecordingsList from './components/RecordingsList';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [meetingId, setMeetingId] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [participantId, setParticipantId] = useState(null);

  const handleMeetingCreated = (id, name, pId) => {
    setMeetingId(id);
    setParticipantName(name);
    setParticipantId(pId);
    setCurrentView('meeting');
  };

  const handleMeetingJoined = (id, name, pId) => {
    setMeetingId(id);
    setParticipantName(name);
    setParticipantId(pId);
    setCurrentView('meeting');
  };

  const handleLeaveMeeting = () => {
    setMeetingId(null);
    setParticipantName('');
    setParticipantId(null);
    setCurrentView('home');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#home">
            <FaVideo className="me-2" />
            WebRTC Meeting App
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="ms-auto">
              {currentView === 'home' && (
                <>
                  <Nav.Link onClick={() => setCurrentView('create')}>
                    Create Meeting
                  </Nav.Link>
                  <Nav.Link onClick={() => setCurrentView('join')}>
                    Join Meeting
                  </Nav.Link>
                  <Nav.Link onClick={() => setCurrentView('recordings')}>
                    <FaRecordVinyl className="me-1" />
                    Recordings
                  </Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="flex-grow-1 py-4">
        {currentView === 'home' && (
          <div className="text-center py-5">
            <h1 className="display-4 mb-4">Welcome to WebRTC Meeting</h1>
            <p className="lead mb-5">
              Create or join a meeting to start video conferencing with recording capabilities
            </p>
            <div className="d-flex justify-content-center gap-3">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentView('create')}
              >
                Create New Meeting
              </button>
              <button
                className="btn btn-success btn-lg"
                onClick={() => setCurrentView('join')}
              >
                Join Meeting
              </button>
              <button
                className="btn btn-info btn-lg"
                onClick={() => setCurrentView('recordings')}
              >
                View Recordings
              </button>
            </div>
          </div>
        )}

        {currentView === 'create' && (
          <CreateMeeting onMeetingCreated={handleMeetingCreated} />
        )}

        {currentView === 'join' && (
          <JoinMeeting onMeetingJoined={handleMeetingJoined} />
        )}

        {currentView === 'meeting' && (
          <MeetingRoom
            meetingId={meetingId}
            participantName={participantName}
            participantId={participantId}
            onLeave={handleLeaveMeeting}
          />
        )}

        {currentView === 'recordings' && (
          <RecordingsList onBack={() => setCurrentView('home')} />
        )}
      </Container>

      <footer className="bg-light py-3 text-center">
        <small className="text-muted">
          WebRTC Meeting App - Built with React and ASP.NET Core
        </small>
      </footer>
    </div>
  );
}

export default App;