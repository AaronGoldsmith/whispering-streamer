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

    const resp = await openai.createTranscription(fs.createReadStream("temp_audio.wav"), "whisper-1","The transcript is taken while opening wedding gifts. There may be some background noise which interfered. \"unkonwn\" got us a visa gift card. \nI got one dollar from Joe and two dollars from Sam, \nthree dollars from Jose, gift card to TJ's from Ma'am.\n\n Okay.. but yeah");
    fs.unlinkSync("temp_audio.wav");

    const transcription = resp.data.text;
    res.status(200).json({ transcription });

  } catch (error) {
    console.error("Error during transcription:", error);
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
