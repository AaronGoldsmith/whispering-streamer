require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const util = require('./util');

const prompt_config = require('./util/prompt_config.json');
const { systemPrompt, noShot, fewShot } = prompt_config;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // TODO: [PROD] update this to the frontend URL in production
  },
});

const processingQueue = [];

const streams = {};
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
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
      setTimeout(() => {
        try{
          ffmpeg(streams[segmentId].tempFilePath)
          .format('mp3')
          .on('end', async () => {
            
            console.log('Finished converting to mp3');

            try {
              if(parseFloat(streams[segmentId].max_volume) > -30 && 
                  parseFloat(streams[segmentId].mean_volume) > -50){
                const transcription = await util.processMP3(openai, streams[segmentId].outputFilePath);
                socket.emit('transcription', { transcription });
              }
              else{
                console.log('too quiet, not sending to transcription service')
              }
             
            } catch (error) {
              console.error('Error during transcription:', error);
              socket.emit('transcription', { error: 'Transcription failed' });
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
          .on('stderr', function(stderrLine) {
            // This event is emitted for each line that FFmpeg writes to stderr.
            // stderrLine is a string containing one line of text.
            if (stderrLine.includes('mean_volume')) {
              // console.log('Mean volume:', stderrLine.split(':')[1].trim());
              streams[segmentId].mean_volume = stderrLine.split(':')[1].trim()
            } else if (stderrLine.includes('max_volume')) {
              // console.log('Max volume:', stderrLine.split(':')[1].trim());
              streams[segmentId].max_volume = stderrLine.split(':')[1].trim()
            }
          })
          .on('error', (ffmpeg_err) => {
            console.log(`An error occurred during conversion: ${ffmpeg_err.message}`);
            console.log(ffmpeg_err);
          })
          .output(streams[segmentId].outputFilePath)
          .audioFilters('volumedetect')  // apply 'volumedetect' filter
          .run();
      }catch(err){
        processNextSegment(socket)
        console.log(err)}
      }, 1500);
    });
  }

  socket.on('stream', (data) => {
    const { segmentId, audioBlob } = data;

    console.log('stream received');
    // If this is a new segment, create a new file stream for it
    if (!streams[segmentId]) {
      const tempFilePath = path.join(__dirname, 'audio', `${segmentId}.wav`);
      const outputFilePath = path.join(__dirname, 'audio', `${segmentId}.mp3`);
      const tempFileStream = fs.createWriteStream(tempFilePath);
      streams[segmentId] = { tempFileStream, tempFilePath, outputFilePath };
      console.log('setting up temp wav file for ', segmentId);

      tempFileStream.on('finish', () => {
        console.log(`Finished writing to ${tempFilePath}`);
        // Add the segment to the processing queue
        processingQueue.push(segmentId);

        // in case a file prevented the program from continuing.
        // TODO: find a better solution when ffmpeg errors out
        if (processingQueue == 3) {
          processingQueue.shift();
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



app.post('/transform', async (req, res) => {
  console.log('body', req.body);
  const prompt = `Audio Transcription: ${req.body.data}\nFile: Name of Guest, Gift Details, Follow up question (optional)`;
  const messages = [
    systemPrompt,
    ...noShot,
    ...fewShot,
    { role: 'user', content: prompt },
  ];
  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
    });
    console.log(completion.data.choices[0].message);
    res.status(200).json(completion.data.choices[0].message);
  } catch (error) {
    console.error('Error during CSV response from ChatCompletions endpoint');
    res.status(500).json({ error: `ChatCompletion failed${error}` });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
