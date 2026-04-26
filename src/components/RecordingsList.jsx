import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { FaPlay, FaDownload, FaTrash, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import RecordingPlayer from './RecordingPlayer';

const RecordingsList = ({ onBack }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:7013';

      // First, get all meetings
      const meetingsResponse = await axios.get(`${apiUrl}/api/meeting`);

      // Then get recordings for each meeting
      let allRecordings = [];
      for (const meeting of meetingsResponse.data) {
        const recordingsResponse = await axios.get(`${apiUrl}/api/recording/meeting/${meeting.id}`);
        allRecordings = [...allRecordings, ...recordingsResponse.data.map(r => ({
          ...r,
          meetingName: meeting.name
        }))];
      }

      setRecordings(allRecordings);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:7013';
      await axios.delete(`${apiUrl}/api/recording/${recordingId}`);
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (err) {
      console.error('Error deleting recording:', err);
      alert('Failed to delete recording');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (selectedRecording) {
    return (
      <RecordingPlayer
        recording={selectedRecording}
        onBack={() => setSelectedRecording(null)}
      />
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center mb-4">
        <Button variant="link" onClick={onBack} className="me-3">
          <FaArrowLeft /> Back
        </Button>
        <h2 className="mb-0">Meeting Recordings</h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading recordings...</p>
        </div>
      ) : recordings.length === 0 ? (
        <Alert variant="info">
          No recordings found. Join a meeting and start recording!
        </Alert>
      ) : (
        <Row>
          {recordings.map(recording => (
            <Col md={6} lg={4} key={recording.id} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>{recording.fileName}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {recording.meetingName}
                  </Card.Subtitle>
                  <Card.Text>
                    <small>
                      Recorded: {new Date(recording.recordedAt).toLocaleString()}<br />
                      Size: {formatFileSize(recording.fileSize)}
                    </small>
                  </Card.Text>
                  <div className="d-flex justify-content-between">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <FaPlay /> Play
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      href={recording.blobUrl}
                      target="_blank"
                      download
                    >
                      <FaDownload /> Download
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(recording.id)}
                    >
                      <FaTrash /> Delete
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default RecordingsList;