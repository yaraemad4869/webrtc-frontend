import React, { useState } from 'react';
import signalRService from '../services/signalRService2';

export const CreateMeeting = ({ onMeetingCreated }) => {
  const [meetingName, setMeetingName] = useState('');
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingName.trim() || !userName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsCreating(true);

    try {
      await signalRService.startConnection();
      const meetingId = await signalRService.createMeeting(meetingName, userName);
      if (meetingId) {
        onMeetingCreated(meetingId, userName);
      } else {
        alert('Failed to create meeting');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please make sure the backend server is running.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h4>Create New Meeting</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="meetingName" className="form-label">
                  Meeting Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="meetingName"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  placeholder="Enter meeting name"
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
                  className="btn btn-primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Meeting'}
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