import React, { useState, useRef } from "react";
import Recorder from "recorder-js";
import "./AudioRecorder.css";
// import "../styles/ResponsiveTable.css";

// 25MB
const MAX_FILE_SIZE = 25000000;
const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("")
  const [recordingList, setRecordingList] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const recorder = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder.current = new Recorder(new (window.AudioContext || window.webkitAudioContext)(), {
        onAnalysing: (data) => {
          setRecordingList(data)
        },
      });
      recorder.current.init(stream);
      recorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = async () => {
    if (recorder.current && isRecording) {
      try {
        const { blob } = await recorder.current.stop();
        setAudioBlob(blob);
        setIsRecording(false);

        // Stop the audio stream
        if (recorder.current.stream) {
          recorder.current.stream.getTracks().forEach(track => track.stop());
        }
        recorder.current = null;
      } catch (err) {
        console.error(err);
      }
    }
  };

  //  not used, won't be used unless creating a custom perview
  const playAudio = () => {
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
  };

  const sendTranscript = async (text) => {
    const response = await fetch("/transform", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "data": text })
    });
    if (response.ok) {
      const data = await response.json();
      setParsedData(data)
    }
  }

  const sendAudio = async () => {
    const formData = new FormData();
    formData.append("audio", new Blob([audioBlob], { type: "audio/wav" }));
    console.log(audioBlob.size)
    if (audioBlob.size > MAX_FILE_SIZE) {
      // Replace MAX_FILE_SIZE with the maximum size in bytes you want to allow
      console.error(`The audio file is too large. Maximum size is ${MAX_FILE_SIZE} bytes.`);
      return;
    }
  
    const response = await fetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      setTranscription(data.transcription);
      sendTranscript(data.transcription)
    } else {
      console.error("Failed to transcribe audio");
    }
  };


  return (
    <div className="audio-recorder">
      <div className="button-list">
        <button
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>

        <button
          onClick={sendAudio}
          disabled={!audioBlob || isRecording }
        >
          Transcribe
        </button>
      </div>
      <table className="audio-controller">
        <thead>
        <tr>
          <th>Preview</th>
          <th style={{"width": "70%"}}>Transcription</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td className="audioPreview" data-label="Preview">
              <audio src={audioBlob ? URL.createObjectURL(audioBlob) : ""} controls />
          </td>
          <td className="transcription" data-label="Transcription"> 
              <p>{transcription}</p>
          </td>
        </tr>
        <tr>
          <td>{recordingList}</td>
        </tr>
        </tbody>
      </table>
      <div className="csv-extract">
        <pre>
        {parsedData?parsedData.content:"Name of Guest,Gift Details,Follow up question"}
        </pre>
      </div>
    </div>
  );
};

export default AudioRecorder;
