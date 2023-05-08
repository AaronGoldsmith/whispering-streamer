import React, { useState, useRef, useEffect } from "react";
import Recorder from "recorder-js";

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const recorder = useRef(null);

  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder.current = new Recorder(new (window.AudioContext || window.webkitAudioContext)(), {
          onAnalysing: (data) => {
            // You can use this callback to visualize audio data (e.g., with an audio visualizer)
          },
        });
        recorder.current.init(stream);
      } catch (err) {
        console.error(err);
      }
    };
    initializeRecorder();
  }, []);

  const startRecording = async () => {
    if (recorder.current) {
      recorder.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    if (recorder.current && isRecording) {
      try {
        const { blob } = await recorder.current.stop();
        setAudioBlob(blob);
        setIsRecording(false);
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
