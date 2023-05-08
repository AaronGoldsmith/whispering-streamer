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
    // const audioURL = new Audio(URL.createObjectURL(audioBlob));
    formData.append("audio", new Blob([audioBlob], { type: "audio/wav" }));

    const response = await fetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(data)
      setTranscription(data.transcription);
    } else {
      console.error("Failed to transcribe audio");
    }
  };

  return (
    <div className="audio-recorder">
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
   
        <button onClick={playAudio} disabled={!audioBlob || isRecording}>
          Play Recorded Audio
        </button>
        <button onClick={sendAudio} disabled={!audioBlob ||  isRecording }>
          Transcribe Audio
        </button>

        <div className="transcription">
          <strong>Transcription:</strong>
          <p>{transcription}</p>
      </div>
    </div>
  );
};

export default AudioRecorder;
