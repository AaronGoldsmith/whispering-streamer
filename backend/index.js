require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors")
const path = require("path")
const { v4: uuidv4 } = require('uuid')
const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');
const util = require("./util");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();

app.use(cors());
app.use(express.json())

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // TODO: [PROD] update this to the frontend URL in production
  },
});

let processingQueue = [];

const streams = {} 
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('stream', (data) => {
    const { segmentId, audioBlob } = data;

    console.log('stream received')
    // If this is a new segment, create a new file stream for it
    if (!streams[segmentId]) {
      const tempFilePath = path.join(__dirname, "audio", `${segmentId}.wav`);
      const outputFilePath = path.join(__dirname, "audio", `${segmentId}.mp3`);
      const tempFileStream = fs.createWriteStream(tempFilePath);
      streams[segmentId] = { tempFileStream, tempFilePath, outputFilePath };
      console.log('setting up temp wav file for ', segmentId)

      tempFileStream.on('finish', () => {
        console.log(`Finished writing to ${tempFilePath}`);
        // Add the segment to the processing queue
        processingQueue.push(segmentId);

        // in case a file prevented the program from continuing.
        // TODO: find a better solution when ffmpeg errors out
        if(processingQueue == 3){
          processingQueue.shift()
        }

        console.log('added to processingQueue: ', processingQueue.length);
        // If there's only one segment in the queue, start processing it
        if (processingQueue.length === 1) {
          processNextSegment(socket);
        }
      });
    }

    const buffer = Buffer.from(audioBlob); // Convert blob to buffer

    // Write the buffer to the file stream and end the stream
    streams[segmentId].tempFileStream.write(buffer);
    streams[segmentId].tempFileStream.end();
  });
});


  function processNextSegment(socket) {
    const segmentId = processingQueue[0];
    
    console.log('Processing next segment ', streams[segmentId].tempFilePath.split('/').pop());
     // Check if the file exists and is not empty
    fs.stat(streams[segmentId].tempFilePath, (err, stats) => {
      if (err) {
        console.error(`Error checking file ${streams[segmentId].tempFilePath}: ${err}`);
        // Handle error, e.g. by removing the segment from the queue and processing the next one
        processingQueue.shift();
        if (processingQueue.length > 0) {
          processNextSegment(socket);
        }
        return;
      }

      if (stats.size === 0) {
        console.error(`File ${streams[segmentId].tempFilePath} is empty`);
        // Handle error, same as above
        processingQueue.shift();
        if (processingQueue.length > 0) {
          processNextSegment(socket);
        }
        return;
      }
       // Run the conversion process after slight delay
       setTimeout(()=>{
            ffmpeg(streams[segmentId].tempFilePath)
            .format("mp3")
            .on('end', async function () {
              console.log('Finished converting to mp3');
              try {
                const transcription = await util.processMP3(openai, streams[segmentId].outputFilePath);
                socket.emit("transcription", { transcription });
              } catch (error) {
                console.error("Error during transcription:", error);
                socket.emit("transcription", { error: "Transcription failed" });
              } finally {
                // Cleanup
                if (streams[segmentId]) {
                  streams[segmentId].tempFileStream.end();
                  fs.unlinkSync(streams[segmentId].tempFilePath);
                }
              }
        
              // Remove the processed segment from the queue and start processing the next one
              processingQueue.shift();
              if (processingQueue.length > 0) {
                processNextSegment(socket);
              }
            })
            .on('error', function (err) {
              console.log('An error occurred during conversion: ' + err.message);
              console.log(err)
            })
            .output(streams[segmentId].outputFilePath)
            .run();

        },2000)
       })
      
   
}


app.post("/transform", async (req, res) => {
  console.log('body', req.body)
  const systemPrompt = { role: "system", content: "You are taking a transcription during a gift opening and formatting it for a CSV. The CSV exists with headers \"Name of Guest\", \"Gift Details\", \"Follow up question (optional)\". Only respond with the new line separated rows. Any other response will interfere with the program's output. If no gift-giving happenings are found, respond with '[NA]'; before doing so first try to identify any gifts listed and match them to the associated senders." }
  const noShot = [{ role: "user", content: "Audio Transcription: Oh my Two hundred dollars from Bri's godmother. Uh, which what's your godmother's name, Bridget. Darron Bri may, god pour all this blessings in your marriage may He guide you both with his love. Always cherish and love each other by swishes and the best is yet to come.It is really nice. Oh wow.\nJesus. 200 dollars in amazon cards from Tio Carlos\nAre you putting the gifts back in here? Yeah.\nThis is literally the best card ever, who is it from. Your dad. Oh, he literally chose the best ***** card. That is the will let them know. Darron, and you're in too bad. The cats can't be at the wedding {dot} {dot}. We're thrilled to be here with you today. Sending much love. Always love.\nIrene. Okay. I like it looked like a jig anime. Yeah. That is a really nice. I like love. Oh. Yeah, okay. Wait no, yeah, my dad. Yeah we i think he thought he hand brought one over here. There's oh i think there is a card over there that he is also for my dad. If you just want to drop that real quick. The others too. And, We got. A thousand dollars from. Uh, the Dorelmo family, right? Yeah, okay. This one must turn dresses and stay gave us 300. This is from grandma. Two thousand dollars. Yeah.Oh yeah. and a thousand from Aunt sandy and uncle randy. Another gift from Doug! 500 dollars to bed bath and beyond. \nFile: Name of Guest, Gift Details, Follow up question" },
  { role: "assistant", content: "\"Bri's godmother (Bridget)\",\"200 dollars\",\n\"Tio Carlos\",\"200 dollars in Amazon cards\", \"dad,Best card ever\",\"father of bride or groom? /Let them know it was the best card\"\n\"Irene\",\"Card with love\",\n\"Dorelmo family\",\"1000 dollars\",\n\"Steve\",\"300 dollars\",\"I might have misheard the name when you said 'stay gave us 300'\"\n\"Grandma\",\"2000 dollars\",\n\"Aunt Sandy and Uncle Randy\",\"1000 dollars\",\n\"Doug\",\"500 dollars to Bed Bath and Beyond\"," }
  ]
  const fewShot = [
    { role: "user", content: "Audio Transcription: I got one dollar from Joe and two dollars from Sam, three dollars from Jose, gift card to TJ's from Ma'am. Okay.. but yeah" },
    { role: "assistant", content: "\"Joe\",\"$1\",\n\"Sam\",\"$2\",\n\"Jose\",\"$3\" ,\n\"Ma'am\",\"gift card to TJ's\",\"Did you say Ma'm or mom?\"" },]

  const prompt = `Audio Transcription: ${req.body.data}\nFile: Name of Guest, Gift Details, Follow up question (optional)`
  const messages = [
    systemPrompt,
    ...noShot,
    ...fewShot,
    { role: "user", content: prompt }
  ]
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });
    console.log(completion.data.choices[0].message);
    res.status(200).json(completion.data.choices[0].message)
  }
  catch (error) {
    console.error("Error during CSV response from ChatCompletions endpoint")
    res.status(500).json({ error: "ChatCompletion failed" + error })
  }

})


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
