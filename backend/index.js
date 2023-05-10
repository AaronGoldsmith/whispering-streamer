require("dotenv").config();
const fs = require("fs");
const express = require("express");
const http = require("http");
const ffmpeg = require('fluent-ffmpeg');
const { Server } = require("socket.io");
const cors = require("cors")
const path = require("path")
const multer = require("multer");
const { v4: uuidv4 } = require('uuid')
const { Configuration, OpenAIApi } = require("openai");


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json())

// Configure multer storage for audio uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 25000000 } // Limit file size to 10MB 
});
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // TODO: [PROD] update this to the frontend URL in production
  },
});

// io.on("connection", (socket) => {
//   console.log("Client connected:", socket.id);
  
//   socket.on("stream", (data) => {
//     // Here you can handle the incoming audio data
//     console.log("Received audio data");
//     console.log("Data chunk size: ", data.length);
//     console.log(data[0], data[1], data[2], data[3])
//   });

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });


const streams = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let activeRecordings = {};

  // Create a new writable stream for this client
  socket.on('start', () => {
      console.log('\n\nReceived Start')
      const id = uuidv4()
      const tempFilePath = path.join(__dirname, `${id}.wav`);
      const outputFilePath = path.join(__dirname, `${id}.mp3`);
      const tempFileStream = fs.createWriteStream(tempFilePath);
      streams[socket.id] = { tempFileStream, tempFilePath, outputFilePath };
      activeRecordings[socket.id] = true;
      console.log(`creating ${tempFilePath}`);
  });


  socket.on('stream', (data) => {
    if(activeRecordings[socket.id]){
      console.log('Received data chunk');
      streams[socket.id].tempFileStream.write(new Buffer.from(data));
    } 
  });

  socket.on('stop', async () => {
    console.log('Stopping recording\n');
    activeRecordings[socket.id] = false;

    // Process the audio data and send it to the transcription service
    setTimeout(async () => {
      // Process the audio data and send it to the transcription service
      try {
        const input = fs.createReadStream(streams[socket.id].tempFilePath);
        const output = streams[socket.id].outputFilePath;
        console.log('Processing: ',streams[socket.id].tempFilePath )
        // Run the conversion process
        ffmpeg(input)
          .format("mp3")
          .on('end', function() { 
            // callback when ffmpeg finishes writing to disk executed 
            console.log('Finished processing');
            processMP3(output)
            if(streams[socket.id]){
              streams[socket.id].tempFileStream.end();
              fs.unlinkSync(streams[socket.id].tempFilePath);
            }
           
          })
          .on('error', function(err) { // New error handler
            console.log('An error occurred during conversion: ' + err.message);
          })
          .output(streams[socket.id].outputFilePath)
          .run();

        console.log('mp3 saved to: ', streams[socket.id].outputFilePath)
        
        streams[socket.id].tempFileStream.on('error', function(err) { // New error handler
          console.log('An error occurred with the file stream: ' + err.message);
        });

    

      } catch (error) {
        console.error("Error during transcription:", error);
        socket.emit("transcription", { error: "Transcription failed" });

         // Delete the temp file even if an error occurred
        if(streams[socket.id]){
          fs.unlinkSync(streams[socket.id].tempFilePath);
        }
      }
      delete streams[socket.id];
    }, 1000); // Adjust delay as needed
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // If the client disconnected before sending 'endStream', we should clean up the stream and file
    if (streams[socket.id]) {
      streams[socket.id].tempFileStream.end();
      delete streams[socket.id];
    }
  });

  async function processMP3(filepath){
    const resp = await openai.createTranscription(fs.createReadStream(filepath), "whisper-1");
    const transcription = resp.data.text;
    socket.emit("transcription", { transcription });
  }
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {

  try{
    const resp = await openai.createTranscription(transform, "whisper-1");
    const transcription = resp.data.text;
    res.status(200).json({ transcription });

  } catch (error) {
    console.error("Error during transcription:", error.data);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.post("/transform", async (req, res) => {  
  console.log(req.body)
  const systemPrompt = {role: "system", content: "You are taking a transcription and formatting it as a CSV with headers \"Name of Guest\", \"Gift Details\", \"Follow up question to help with generating a thank you card\" (optional)."}
  const noShot = [    {role: "user", content: "Oh my Two hundred dollars from Sharon's godmother. Uh, which what's your godmother's name, Bridget. Aaron sharon may, god pour all this blessings in your marriage may He guide you both with his love. Always cherish and love each other by swishes and the best is yet to come.It is really nice. Oh wow.\Jesus. 200 dollars in amazon cards from Tio Carlos\nAre you putting the gifts back in here? Yeah.\nThis is literally the best card ever, who is it from. Your dad. Oh, he literally chose the best fucking card. That is the will let them know. Aaron, and you're in too bad. The cats can't be at the wedding {dot} {dot}. We're thrilled to be here with you today. Sending much love. Always love.\nIrene. Okay. I like it looked like a jig anime. Yeah. That is a really nice. I like love. Oh. Yeah, okay. Wait no, yeah, my dad. Yeah we i think he thought he hand brought one over here. There's oh i think there is a card over there that he is also for my dad. If you just want to drop that real quick. The others too. And, We got. A thousand dollars from. Uh, the Conselmo family, right? Yeah, okay. This one must turn dresses and stay gave us 300. This is from granny. Five thousand dollars. Yeah.Oh yeah. and a thousand from Aunt sandy and uncle joe. Another gift from Doug! 500 dollars to bed bath and beyond."},
                      {role: "assistant", content: "Name of Guest,Gift Details,Follow up question\nSharon's godmother (Bridget),200 dollars,\nTio Carlos,200 dollars in Amazon cards, dad,Best card ever, father of bride or groom? /Let them know it was the best card\nIrene,Card with love,\nConselmo family,1000 dollars,\nSteve,300 dollars,I might have misheard the name when you said \"stay gave us 300\"\nGranny,5000 dollars,\nAunt Sandy and Uncle Joe,1000 dollars,\nDoug,500 dollars to Bed Bath and Beyond,"}
  ]
  const fewShot = [
    {role: "user", content: "I got one dollar from Joe and two dollars from Sam, three dollars from Jose, gift card to TJ's from Ma'am. Okay.. but yeah"},
    {role: "assistant", content: "guest,gift details,follow up question\nJoe,$1,\nSam,$2,\nJose,$3 ,\nMa'am,gift card to TJ's,Did you say Ma'm or mom?"},
  ]
  const messages =  [
      systemPrompt,
      ...fewShot,
      {role: "user", content: req.body.data}
    ]     
  // console.log(messages)
  try{
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });
    console.log(completion.data.choices[0].message);
    res.status(200).json(completion.data.choices[0].message)
  }
  catch (error) {
    console.error("Error during CSV response from ChatCompletions endpoint")
      res.status(500).json({error: "ChatCompletion failed" + error})
  }
 
})


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
