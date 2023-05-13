import React, { useState, useRef, useContext, useEffect } from "react";
import { WebSocketContext } from "./WebSocketProvider";
import { v4 as uuidv4 } from 'uuid';
import { CSVTableBody } from "./CSVTable"
import "../styles/AudioRecorder.css";

const MIN_BLOB_SIZE = 1024; // 1KB 


const isValid = (str) => {
  // break early and don't add to parsed data
  if (str.length < 4 || str.includes('[NA]')) {
    return false
  }
  return true;
}

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [transcription, setTranscription] = useState("")
  const [parsedData, setParsedData] = useState(null)
  const socket = useContext(WebSocketContext);
  const mediaRecorder = useRef(null)
  const audioStream = useRef(null)

  let chunks = [];
  const segmentDuration = 10000;

  // as soon as the component mounts
  useEffect(() => {
    // request for access to the client microphone
    isRecording && navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        audioStream.current = stream;
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = handleDataAvailable;
        mediaRecorder.current.onstop = handleStop;
      });

    if (socket) {
      socket.on('transcription', async (data) => {
        if (data.transcription) {
          // update transcription box with the newly receieved details
          // do not clear out the existing transcription
          setTranscription((prevTranscription) => `${prevTranscription}\n\n${data.transcription}`);

          // async function that sends the transcription and receives a CSV formatted string
          // Note: only send the current transcript
          const csvString = await sendTranscript(data.transcription)
          isValid(csvString) && setParsedData((prevParsedData) => `${prevParsedData}\n\n${csvString}`)
        }
        // data.transcription == false when data.transcription = ''
        else if (data.transcription == '') {
          console.log('no transcription recorded')
        }
        else {
          console.error('Failed to transcribe audio');
        }
      });
    }
    return () => {
      if (socket) {
        socket.off('transcription');
      }
    };
  }, [socket]); // if socket updates, rerun the block

  function handleStop() {
    const audioBlob = new Blob(chunks, { 'type': 'audio/wav' });
    // don't send audio blobs under 1kb
    if (audioBlob.size > MIN_BLOB_SIZE) {
      const segmentId = uuidv4();
      console.log(`Sending audio segment ${segmentId}`);
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

  // called when the user clicks the "start recording" button
  const startStream = async () => {
    // start and stop recording at regular intervals to simulate chunked streaming
    const intervalId = setInterval(() => {
      if (mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
        mediaRecorder.current.start(segmentDuration)
      }
    }, segmentDuration);

    setIsRecording(true);
    setIntervalId(intervalId);
    setupStream();

    // mediaRecorder.current.start();
  };

  const setupStream = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        audioStream.current = stream;
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = handleDataAvailable;
        mediaRecorder.current.onstop = handleStop;
        mediaRecorder.current.start(segmentDuration);
      });
  }

  const stopStream = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
    setIsRecording(false)
  };


  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
      const audioBlob = new Blob(chunks, { 'type': 'audio/wav' });
      if (audioBlob.size > MIN_BLOB_SIZE) {
        const segmentId = uuidv4();
        // console.log(`Sending audio segment ${segmentId}`);
        // console.log(audioBlob)
        socket.emit('stream', { segmentId, audioBlob });
        chunks = [];
      }
    }
    else {
      console.log('no data received in the event')
    }
  };

  const sendTranscript = async (text) => {
    const response = await fetch("/transform", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "data": text })
    })
    if (response.ok) {
      const data = await response.json();
      return data.content
    }
  }

  const headers = ["Name of Guest", "Gift Details", "Follow up question"]
  return (
    <div className="audio-recorder">
      <div className="button-list">
        <button
          onClick={isRecording ? stopStream : startStream}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>

      </div>
      <table className="audio-controller">
        <thead>
          <tr>
            <th colSpan={3}> Transcription</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="transcription" data-label="Transcription" colSpan={3}>
              <p>{transcription}</p>
            </td>
          </tr>
          <CSVTableBody headers={headers} data={parsedData} />
        </tbody>
      </table>
    </div>
  );
};

export default AudioRecorder;
