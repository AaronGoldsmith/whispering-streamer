import React, { createContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const WebSocketContext = createContext();

const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io("http://localhost:3001"); // replace with your backend server URL
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
