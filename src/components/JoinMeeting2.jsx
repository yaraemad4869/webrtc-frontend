import React, { useState } from 'react';
import signalRService from '../services/signalRService2';

export const JoinMeeting = ({ onMeetingJoined }) => {
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingId.trim() || !userName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsJoining(true);

    try {
      await signalRService.startConnection();
      const success = await signalRService.joinMeeting(meetingId, userName);

      if (success) {
        onMeetingJoined(meetingId, userName);
      } else {
        alert('Meeting not found or already ended');
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
      alert('Failed to join meeting. Please check the meeting ID and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h4>Join Meeting</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="meetingId" className="form-label">
                  Meeting ID
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="meetingId"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  placeholder="Enter meeting ID"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="userName" className="form-label">
                  Your Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={isJoining}
                >
                  {isJoining ? 'Joining...' : 'Join Meeting'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.history.back()}
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};