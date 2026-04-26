import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { MeetingRoom } from './components/MeetingRoom2';
import { JoinMeeting } from './components/JoinMeeting2';
import { CreateMeeting } from './components/CreateMeeting2';
import { RecordingsList } from './components/RecordingsList2';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [meetingId, setMeetingId] = useState(null);
  const [participantName, setParticipantName] = useState('');

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">WebRTC Meeting App</h1>

      {currentView === 'home' && (
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="d-grid gap-3">
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
        </div>
      )}

      {currentView === 'create' && (
        <CreateMeeting
          onMeetingCreated={(id, name) => {
            setMeetingId(id);
            setParticipantName(name);
            setCurrentView('meeting');
          }}
        />
      )}

      {currentView === 'join' && (
        <JoinMeeting
          onMeetingJoined={(id, name) => {
            setMeetingId(id);
            setParticipantName(name);
            setCurrentView('meeting');
          }}
        />
      )}

      {currentView === 'meeting' && meetingId && (
        <MeetingRoom
          meetingId={meetingId}
          participantName={participantName}
          onLeave={() => {
            setCurrentView('home');
            setMeetingId(null);
            setParticipantName('');
          }}
        />
      )}

      {currentView === 'recordings' && (
        <RecordingsList onBack={() => setCurrentView('home')} />
      )}
    </div>
  );
}

export default App;