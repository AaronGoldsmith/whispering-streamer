import React, { useState, useRef, useContext, useEffect} from "react";
import { WebSocketContext } from "./WebSocketProvider";
import  {CSVTable} from "./CSVTable"
import "./AudioRecorder.css";

// 25MB
const MAX_FILE_SIZE = 25000000;
const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("")
  const [recordingList, setRecordingList] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const socket = useContext(WebSocketContext);
  const mediaRecorder = useRef(null)
  const audioStream = useRef(null)


  useEffect(() => {
    // setParsedData("Name of Guest, Gift Details, Follow up question")
    if (socket) {
      socket.on('transcription', async (data) => {
        if (data.transcription) {
          // update transcription box with the newly receieved details
          // do not clear out the existing transcription
          setTranscription((prevTranscription) => `${prevTranscription}\n\n${data.transcription}`);
    
          // async function that sends the transcription and receives a CSV formatted string
          // only send the current transcript
          const csvString = await sendTranscript(data.transcription)
          console.log(csvString)
          setParsedData((prevParsedData) => `${prevParsedData}\n\n${csvString}`)
        } else {
          console.error('Failed to transcribe audio');
        }
      });
    }    
    return () => {
      if (socket) {
        socket.off('transcription');
      }
    };
  }, [socket]); // Adding socket as a dependency
  



  const startStream = async () => {

    const stream  = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStream.current = stream;
    mediaRecorder.current  = new MediaRecorder(audioStream.current);

    socket.emit('start');

    // This event is fired when there is audio data available
    mediaRecorder.current.ondataavailable = (e) => {
      // Send the audio data to the server
      socket.emit('stream',e.data);
    };
    // stream data every 1 seconds
    mediaRecorder.current.start(1000);
    setIsRecording(true)
  };
  

  const stopStream = async () => {

    // Emit a stop event
    setIsRecording(false);
    socket.emit("stop");
    if (audioStream.current) {
      audioStream.current.getTracks().forEach((track) => track.stop());
    } else {
      console.error("Audio stream is not defined");
    }
    mediaRecorder.current.active && await mediaRecorder.current.stop();
    audioStream.current = null
  }
  

  //  not used, won't be used unless creating a custom perview
  /**
   * @deprecated
   */
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
    })
    if (response.ok) {
      const data = await response.json();
      return data.content
    }
  }

  /**
   * 
   *  @deprecated
   */
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
          <th>Transcription</th>
        </tr>
        </thead>
        <tbody>
        <tr>
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
          <CSVTable headers={headers} data={parsedData}>
        </CSVTable>
       
      </div>
    </div>
  );
};

export default AudioRecorder;
