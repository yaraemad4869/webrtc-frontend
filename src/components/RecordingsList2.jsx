import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const RecordingsList = ({ onBack }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meetingId, setMeetingId] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);

  const API_BASE_URL = 'https://localhost:7013/api';

  const fetchRecordings = async (id) => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/recordings/meeting/${id}`);
      setRecordings(response.data);
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
      alert('Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecordings(meetingId);
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/recordings/${recordingId}`);
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      alert('Recording deleted successfully');
    } catch (error) {
      console.error('Failed to delete recording:', error);
      alert('Failed to delete recording');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="recordings-list">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h4>Meeting Recordings</h4>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to Home
          </button>
        </div>
        <div className="card-body">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Meeting ID"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit">
                Search Recordings
              </button>
            </div>
          </form>

          {/* Recordings List */}
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : recordings.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Date Recorded</th>
                    <th>File Size</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recordings.map(recording => (
                    <tr key={recording.id}>
                      <td>{recording.fileName}</td>
                      <td>{new Date(recording.recordedAt).toLocaleString()}</td>
                      <td>{formatFileSize(recording.fileSize)}</td>
                      <td>
                        <span className={`badge bg-${recording.status === 'Completed' ? 'success' :
                          recording.status === 'Processing' ? 'warning' : 'danger'
                          }`}>
                          {recording.status}
                        </span>
                      </td>
                      <td>
                        {recording.blobUrl && (
                          <a
                            href={recording.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-info me-2"
                          >
                            <i className="bi bi-play-circle"></i> Play
                          </a>
                        )}
                        <a
                          href={recording.blobUrl}
                          download
                          className="btn btn-sm btn-success me-2"
                        >
                          <i className="bi bi-download"></i> Download
                        </a>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(recording.id)}
                        >
                          <i className="bi bi-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : meetingId && (
            <div className="alert alert-info">
              No recordings found for this meeting.
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedRecording && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedRecording.fileName}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedRecording(null)}
                ></button>
              </div>
              <div className="modal-body">
                <video controls className="w-100">
                  <source src={selectedRecording.blobUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};