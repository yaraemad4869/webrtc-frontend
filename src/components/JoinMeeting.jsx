import React, { useState } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import signalRService from '../services/signalRService';

const JoinMeeting = ({ onMeetingJoined }) => {
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingId.trim() || !userName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await signalRService.joinMeeting(meetingId);
      if (success) {
        onMeetingJoined(meetingId, userName);
      } else {
        setError('Meeting not found or has ended');
      }
    } catch (err) {
      setError('Failed to join meeting. Please check the meeting ID.');
      console.error('Join meeting error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body className="p-4">
        <h2 className="text-center mb-4">Join Meeting</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="meetingId">
            <Form.Label>Meeting ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter meeting ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="userName">
            <Form.Label>Your Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={loading}
              required
            />
          </Form.Group>

          <div className="d-grid gap-2">
            <Button
              variant="success"
              type="submit"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Joining...
                </>
              ) : (
                'Join Meeting'
              )}
            </Button>

            <Button
              variant="outline-secondary"
              onClick={() => onMeetingJoined(null)}
            >
              Back
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default JoinMeeting;