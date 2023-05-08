import React, { useState, useRef } from "react";
import Recorder from "recorder-js";
import "./AudioRecorder.css";

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("")
  const recorder = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder.current = new Recorder(new (window.AudioContext || window.webkitAudioContext)(), {
        // onAnalysing: (data) => {
        //   // You can use this callback to visualize audio data (e.g., with an audio visualizer)
        // },
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

  const playAudio = () => {
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
  };

  const sendAudio = async () => {
    const formData = new FormData();
    formData.append("audio", new Blob([audioBlob], { type: "audio/wav" }));

    const response = await fetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      setTranscription(data.transcription);
    } else {
      console.error("Failed to transcribe audio");
    }
  };

  const RecordButtonController = () => {
    let buttonText = ""
    let cb = null;
    const buttonTexts = {
      "stop": "Stop Recording",
      "start": "Start Recording",
      "restart": "Record new Audio"
    }
    if(isRecording){
      buttonText = buttonTexts.stop;
      cb = stopRecording;
    }
    else{
      if(audioBlob){
        buttonText = buttonTexts.restart
        cb = startRecording
      }
      else {
        buttonText = buttonTexts.start
      }
      cb = startRecording
    }
    
    return <button onClick={cb}>{buttonText}</button>
  }

  return (
    <div className="audio-recorder">
      <div className="button-list">
        <RecordButtonController/>
        <button onClick={playAudio} disabled={!audioBlob || isRecording}>
          Preview
        </button>
        <button onClick={sendAudio} disabled={!audioBlob || isRecording}>
          Transcribe
        </button>
      </div>
     

      <div className={audioBlob ? "transcription ready" : "transcription"}>
        <strong>Audio</strong>
       
        <hr />

        <strong>Transcription:</strong>
        
        <p>{transcription}</p>
      </div>
    </div>
  );
};

export default AudioRecorder;
