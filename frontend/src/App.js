import React from "react";
import AudioRecorder from "./components/AudioRecorder";
import { WebSocketProvider } from "./components/WebSocketProvider";
import './App.css'

function App() {
  return (
    <WebSocketProvider>
      <div className="App">
        <h1>Wedding Gift Thank You Card Assistant</h1>
        <AudioRecorder />
      </div>
    </WebSocketProvider>
  );
}

export default App
