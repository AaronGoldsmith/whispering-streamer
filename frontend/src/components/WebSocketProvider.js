import React, { createContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const WebSocketContext = createContext();

const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef();

  useEffect(() => {
    // TODO: [PROD] replace with backend server URL
    socketRef.current = io("http://localhost:3000"); 
    setSocket(socketRef.current);

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext, WebSocketProvider };
