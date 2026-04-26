import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaArrowLeft, FaDownload, FaTrash } from 'react-icons/fa';
import axios from 'axios';

const RecordingPlayer = ({ recording, onBack }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, [recording]);

  const fetchMetadata = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:7013';
      const response = await axios.get(`${apiUrl}/api/recording/${recording.id}/metadata`);
      setMetadata(response.data);
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Could not load recording metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:7013';
      await axios.delete(`${apiUrl}/api/recording/${recording.id}`);
      onBack();
    } catch (err) {
      console.error('Error deleting recording:', err);
      alert('Failed to delete recording');
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center mb-4">
        <Button variant="link" onClick={onBack} className="me-3">
          <FaArrowLeft /> Back
        </Button>
        <h2 className="mb-0">{recording.fileName}</h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Body className="p-0">
              <video
                src={recording.blobUrl}
                controls
                className="w-100"
                style={{ maxHeight: '60vh' }}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Recording Details</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner size="sm" /> Loading metadata...
                </div>
              ) : metadata ? (
                <dl>
                  <dt>Recorded</dt>
                  <dd>{new Date(recording.recordedAt).toLocaleString()}</dd>

                  <dt>File Size</dt>
                  <dd>{(recording.fileSize / (1024 * 1024)).toFixed(2)} MB</dd>

                  {metadata.format && (
                    <>
                      <dt>Format</dt>
                      <dd>{metadata.format}</dd>
                    </>
                  )}

                  {metadata.width && metadata.height && (
                    <>
                      <dt>Resolution</dt>
                      <dd>{metadata.width} x {metadata.height}</dd>
                    </>
                  )}

                  {metadata.pages && (
                    <>
                      <dt>Duration</dt>
                      <dd>{metadata.pages} frames</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="text-muted">No metadata available</p>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button
                  variant="success"
                  href={recording.blobUrl}
                  target="_blank"
                  download
                >
                  <FaDownload /> Download Recording
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                >
                  <FaTrash /> Delete Recording
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default RecordingPlayer;