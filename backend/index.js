require("dotenv").config();
const fs = require("fs");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors")
const multer = require("multer");
const { Configuration, OpenAIApi } = require("openai");


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());


// Configure multer storage for audio uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // TODO: update this to the frontend URL in production
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const audioBuffer = Buffer.from(req.file.buffer);
    fs.writeFileSync("temp_audio.wav", audioBuffer);

    const resp = await openai.createTranscription(fs.createReadStream("temp_audio.wav"), "whisper-1");
    fs.unlinkSync("temp_audio.wav");

    const transcription = resp.data.text;
    res.status(200).json({ transcription });

  } catch (error) {
    console.error("Error during transcription:", error);
    res.status(500).json({ error: "Transcription failed" });
  }
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
