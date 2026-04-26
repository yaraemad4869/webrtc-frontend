// VideoPlayer.jsx
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const VideoPlayer = ({ videoId, type = 'stream' }) => {
    const videoRef = useRef(null);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadVideo();
        fetchMetadata();
    }, [videoId]);

    const fetchMetadata = async () => {
        try {
            const response = await fetch(`/api/recordings/${videoId}`);
            const data = await response.json();
            setMetadata(data);
        } catch (err) {
            console.error('Error fetching metadata:', err);
        }
    };

    const loadVideo = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const videoUrl = `/api/recordings/${type}/${videoId}`;

        // Check if HLS is supported and we're using HLS
        if (type === 'hls' && Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 60
            });
            
            hls.loadSource(videoUrl);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                setError('Error loading video');
                console.error('HLS error:', data);
            });
        } else {
            // Fallback to regular video element
            video.src = videoUrl;
            video.addEventListener('loadeddata', () => setLoading(false));
            video.addEventListener('error', () => setError('Error loading video'));
        }
    };

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="video-player">
            {loading && <div className="loading">Loading video...</div>}
            
            <video
                ref={videoRef}
                controls
                width="100%"
                style={{ display: loading ? 'none' : 'block' }}
            />
            
            {metadata && (
                <div className="metadata">
                    <p>File Name: {metadata.fileName}</p>
                    <p>File Size: {(metadata.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    <p>Recorded: {new Date(metadata.recordedAt).toLocaleString()}</p>
                </div>
            )}
            
            <div className="controls">
                <a href={`/api/recordings/download/${videoId}`} download>
                    Download Video
                </a>
            </div>
        </div>
    );
};

export default VideoPlayer;