import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import signalRService from '../services/signalRService';

const CreateMeeting = ({ onMeetingCreated }) => {
  const [meetingName, setMeetingName] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingName.trim() || !userName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const meetingId = await signalRService.createMeeting(meetingName);
      onMeetingCreated(meetingId, userName);
    } catch (err) {
      setError('Failed to create meeting. Please try again.');
      console.error('Create meeting error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body className="p-4">
        <h2 className="text-center mb-4">Create New Meeting</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="meetingName">
            <Form.Label>Meeting Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter meeting name"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
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
              variant="primary"
              type="submit"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Creating...
                </>
              ) : (
                'Create Meeting'
              )}
            </Button>

            <Button
              variant="outline-secondary"
              onClick={() => onMeetingCreated(null)}
            >
              Back
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CreateMeeting;