require("dotenv").config();
const util = require("./util");
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
      try {
        const input = fs.createReadStream(streams[socket.id].tempFilePath);
        const output = streams[socket.id].outputFilePath
        console.log('Processing: ',streams[socket.id].tempFilePath )
        // Run the conversion process
        ffmpeg(input)
          .format("mp3")
          .on('end', async function() { 
            // callback when ffmpeg finishes writing to disk executed 
            console.log('Finished processing');
            try{
              const transcription = await util.processMP3(openai,output);
              socket.emit("transcription", { transcription });
              // processMP3(output)
              if(streams[socket.id]){
                streams[socket.id].tempFileStream.end();
                fs.unlinkSync(streams[socket.id].tempFilePath);
              }
            }
            catch(error){
              console.error(error)
            }
          })
          .on('error', function(err) { // New error handler
            console.log('An error occurred during conversion: ' + err.message);
          })
          .output(streams[socket.id].outputFilePath)
          .run();

        // console.log('mp3 saved to: ', streams[socket.id].outputFilePath)
        
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
    }, 1000); // Defaut delay to prevent overlap over start and end streams
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // If the client disconnected before sending 'endStream', we should clean up the stream and file
    if (streams[socket.id]) {
      streams[socket.id].tempFileStream.end();
      delete streams[socket.id];
    }
  });


/**
 * Transcribes an audio file in MP3 format using OpenAI API, and emits the transcription result to a socket.
   @async
   @function processMP3
   @param {string} filepath - The path to the MP3 file to be transcribed.
   @throws {Error} If the file path is invalid or there is an error in the transcription process.
   @returns {Promise<void>} A Promise that resolves when the transcription is completed and the result is emitted to the socket.
 */
  async function processMP3(filepath){
    let filestream;
    try{
      filestream = fs.createReadStream(filepath)
    }
    catch(error){
      throw ("Unable to read file at ", filepath)
    }
    try{
      // Call OpenAI API to create transcription from the given file
      const resp = await openai.createTranscription(filestream, "whisper-1");
      const transcription = resp.data.text;
      // Emit the transcription result to the socket
      socket.emit("transcription", { transcription });
    }
    catch(error){
      throw ("Unable to create transcription from: ", filepath)
    }
    
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
  const systemPrompt = {role: "system", content: "You are taking a transcription during a gift opening and formatting it for a CSV. The CSV exists with headers \"Name of Guest\", \"Gift Details\", \"Follow up question (optional)\". Only respond with the new line separated rows. Any other output will interfere with the program."}
  const noShot = [    {role: "user", content: "Audio Transcription: Oh my Two hundred dollars from Bri's godmother. Uh, which what's your godmother's name, Bridget. Darron Bri may, god pour all this blessings in your marriage may He guide you both with his love. Always cherish and love each other by swishes and the best is yet to come.It is really nice. Oh wow.\nJesus. 200 dollars in amazon cards from Tio Carlos\nAre you putting the gifts back in here? Yeah.\nThis is literally the best card ever, who is it from. Your dad. Oh, he literally chose the best ***** card. That is the will let them know. Darron, and you're in too bad. The cats can't be at the wedding {dot} {dot}. We're thrilled to be here with you today. Sending much love. Always love.\nIrene. Okay. I like it looked like a jig anime. Yeah. That is a really nice. I like love. Oh. Yeah, okay. Wait no, yeah, my dad. Yeah we i think he thought he hand brought one over here. There's oh i think there is a card over there that he is also for my dad. If you just want to drop that real quick. The others too. And, We got. A thousand dollars from. Uh, the Dorelmo family, right? Yeah, okay. This one must turn dresses and stay gave us 300. This is from grandma. Five thousand dollars. Yeah.Oh yeah. and a thousand from Aunt sandy and uncle randy. Another gift from Doug! 500 dollars to bed bath and beyond. \nFile: Name of Guest, Gift Details, Follow up question"},
                      {role: "assistant", content: "Bri's godmother (Bridget),200 dollars,\nTio Carlos,200 dollars in Amazon cards, dad,Best card ever, father of bride or groom? /Let them know it was the best card\nIrene,Card with love,\nDorelmo family,1000 dollars,\nSteve,300 dollars,I might have misheard the name when you said \"stay gave us 300\"\nGrandma,5000 dollars,\nAunt Sandy and Uncle Randy,1000 dollars,\nDoug,500 dollars to Bed Bath and Beyond,"}
  ]
  const fewShot = [
    {role: "user", content: "Audio Transcription: I got one dollar from Joe and two dollars from Sam, three dollars from Jose, gift card to TJ's from Ma'am. Okay.. but yeah"},
    {role: "assistant", content: "Joe,$1,\nSam,$2,\nJose,$3 ,\nMa'am,gift card to TJ's,Did you say Ma'm or mom?"},  ]

  const prompt = `Audio Transcription: ${req.body.data}\nFile: Name of Guest, Gift Details, Follow up question (optional)`
  const messages =  [
      systemPrompt,
      ...noShot,
      ...fewShot,
      {role: "user", content: prompt}
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
