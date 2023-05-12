import React, { useState, useRef, useContext, useEffect} from "react";
import { WebSocketContext } from "./WebSocketProvider";
import { v4 as uuidv4 } from 'uuid';
import  {CSVTable} from "./CSVTable"
import "./AudioRecorder.css";

// 25MB
const MIN_BLOB_SIZE = 1024;
const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [transcription, setTranscription] = useState("")
  const [parsedData, setParsedData] = useState(null)
  const socket = useContext(WebSocketContext);
  const mediaRecorder = useRef(null)
  const audioStream = useRef(null)

// let mediaRecorder = null;
let chunks = [];
let segmentDuration = 10000;

  // as soon as the component mounts
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      audioStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = handleDataAvailable;
      mediaRecorder.current.onstop = handleStop;
    });

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
          console.log(data)
        }
      });
    }    
    return () => {
      if (socket) {
        socket.off('transcription');
      }
    };
  }, [socket]); // Adding socket as a dependency

  function handleStop() {
    const audioBlob = new Blob(chunks, { 'type' : 'audio/wav' });
    if(audioBlob.size > MIN_BLOB_SIZE) {
      const segmentId = uuidv4();
      console.log(`Sending audio segment ${segmentId}`);
      console.log(audioBlob)
      socket.emit('stream', {segmentId, audioBlob});
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
    // request for access to the client microphone
    // const stream  = await navigator.mediaDevices.getUserMedia({ audio: true });

    // // assign the audioStream ref to the stream
    // audioStream.current = stream;

    // // create a MediaRecorder object to recieve the audio
    // mediaRecorder.current  = new MediaRecorder(audioStream.current);


   

    // mediaRecorder.current.ondataavailable = (e) => {
    //   console.log('mediaRecorder.ondataavailable called.\n\treceived data')
    //   handleDataAvailable(e)
    // };

    // mediaRecorder.current.onstop = () => {
    //   console.log('mediaRecorder.current.onstop called')
    //   const audioBlob = new Blob(chunks, { 'type' : 'audio/wav' });
    //   if(audioBlob.size > MIN_BLOB_SIZE) {
    //     const segmentId = uuidv4();
    //     console.log(`Sending audio segment ${segmentId}`);
    //     socket.emit('stream', {segmentId, audioBlob});
    //   }
    //   chunks = [];
    //   if (isRecording) {
    //     console.log('Starting new recording');
    //     mediaRecorder.current.start();
    //   }
    // };
    

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
    mediaRecorder.current.start(segmentDuration);

   
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
    console.log('reached handleDataAvailable')
    if (event.data.size > 0) {
      chunks.push(event.data);
      const audioBlob = new Blob(chunks, { 'type' : 'audio/wav' });
      if(audioBlob.size > MIN_BLOB_SIZE) {
        const segmentId = uuidv4();
        console.log(`Sending audio segment ${segmentId}`);
        console.log(audioBlob)
        socket.emit('stream', {segmentId, audioBlob});
        chunks = [];
      }
    }
    else{
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
          <th>Transcription</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td className="transcription" data-label="Transcription"> 
              <p>{transcription}</p>
          </td>
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
