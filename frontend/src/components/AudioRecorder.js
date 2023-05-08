import React, { useState, useRef } from "react";
import Recorder from "recorder-js";

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
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

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      {audioBlob && (
        <button onClick={playAudio}>
          Play Recorded Audio
        </button>
      )}
    </div>
  );
};

export default AudioRecorder;
