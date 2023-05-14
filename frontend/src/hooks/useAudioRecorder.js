import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const MIN_BLOB_SIZE = 1024; // 1KB

export const useAudioRecorder = (socket) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioStream = useRef(null);

  let chunks = [];
  const segmentDuration = 10000;

  /**
   * handleDataAvailable is called when the MediaRecorder has data available.
   * It adds the data to the chunks array and sends it to the server if it's large enough.
   */
  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
      const audioBlob = new Blob(chunks, { type: 'audio/wav' });
      if (audioBlob.size > MIN_BLOB_SIZE) {
        const segmentId = uuidv4();
        // eslint-disable-next-line react/destructuring-assignment
        socket.emit('stream', { segmentId, audioBlob });
        chunks = [];
      }
    } else {
      console.log('no data received in the event');
    }
  };

  /**
  * handleStop is called when the MediaRecorder stops recording.
  * It creates an audio blob from the recorded chunks and sends it to the server.
  * If the component is still recording, it restarts the MediaRecorder.
  */
  function handleStop() {
    const audioBlob = new Blob(chunks, { type: 'audio/wav' });
    // don't send audio blobs under 1kb
    if (audioBlob.size > MIN_BLOB_SIZE) {
      const segmentId = uuidv4();
      // eslint-disable-next-line react/destructuring-assignment
      socket.emit('stream', { segmentId, audioBlob });
    }
    chunks = [];
    if (isRecording) {
      if (mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
      mediaRecorder.current.start(segmentDuration);
    }
  }

  /**
  * sendTranscript sends the given text to the server and returns the server's response.
  * @param {string} text - The text to send to the server.
  * @returns {Promise<string>} The server's response containing a CSV string
  */
  const sendTranscript = async (text) => {
    const response = await fetch('/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: text }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.content;
    }
    return 'Error during CSV transform';
  };

  // as soon as the component mounts
  useEffect(() => {
    if (socket) {
      // request for access to the client microphone
      if (isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            audioStream.current = stream;
            mediaRecorder.current = new MediaRecorder(stream);
            mediaRecorder.current.ondataavailable = handleDataAvailable;
            mediaRecorder.current.onstop = handleStop;
          });
      }
      // eslint-disable-next-line react/destructuring-assignment
      socket.on('transcription', async (data) => {
        if (data.transcription) {
          // update transcription box with the newly receieved details
          // do not clear out the existing transcription
          setTranscription((prevTranscription) => `${prevTranscription}\n\n${data.transcription}`);

          // async function that sends the transcription and receives a CSV formatted string
          // Note: only send the current transcript
          const csvString = await sendTranscript(data.transcription);
          if (isValid(csvString)) {
            setParsedData((prevParsedData) => `${prevParsedData}\n\n${csvString}`);
          }
        } else if (data.transcription === '') {
          console.log('no transcription recorded');
        } else {
          console.error('Failed to transcribe audio');
        }
      });
    }
    return () => {
      if (socket) {
        // eslint-disable-next-line react/destructuring-assignment
        socket.off('transcription');
      }
    };
  }, [socket]); // if socket updates, rerun the block

  /**
  * setupStream requests access to the user's microphone and initializes the MediaRecorder.
  */
  const setupStream = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        audioStream.current = stream;
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = handleDataAvailable;
        mediaRecorder.current.onstop = handleStop;
        mediaRecorder.current.start(segmentDuration);
      });
  };

  /**
  * startStream is called when the user clicks the "start recording" button.
  * It starts the MediaRecorder and sets up an interval to stop and restart
  * the MediaRecorder every segmentDuration milliseconds.
  */
  const startStream = async () => {
    // start and stop recording at regular intervals to simulate chunked streaming
    const intervalref = setInterval(() => {
      if (mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
        mediaRecorder.current.start(segmentDuration);
      }
    }, segmentDuration);

    setIsRecording(true);
    setIntervalId(intervalref);
    setupStream();
  };

  /**
  * stopStream is called when the user clicks the "stop recording" button.
  * It stops the MediaRecorder and the stream from the user's microphone.
  */
  const stopStream = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    if (audioStream.current) {
      audioStream.current.getTracks().forEach((track) => track.stop());
      audioStream.current = null;
    }
    setIsRecording(false);
  };

  return {
    isRecording, startStream, stopStream, transcription, parsedData
  };
};
