# Wedding Gift Thank You Card Assistant

This project is a React-based web application that provides an interface for audio recording and transcription. It uses WebSockets for real-time communication and the Web Media API for audio recording.


## Purpose & Motivation
The web app can be used to streamline the thank you card process for birthdays, weddings, etc by automatically transcribing gift opening audio and generating personalized messages for the gift sender.


## Features

- Audio recording: Users can start and stop audio recording. The audio is recorded in chunks and sent to the server for processing.
- Real-time transcription: As the audio is recorded, it's transcribed in real-time and the transcriptions are displayed on the page.
- CSV extraction: The transcriptions are also sent to a server to be transformed into a CSV format, which is then displayed on the page.

## Installation

1. Clone the repository: `git clone https://github.com/AaronGoldsmith/whispering-streamer.git`
2. Install the frontend dependencies: `cd frontend && npm install`
3. Install the backend dependencies: `cd backend && npm install`


## Running locally
1. Start the backend server with `cd backend && npm start`
2. Open a second terminal. Start the client with `cd frontend && npm start`
4. Open your browser and navigate to `http://localhost:3000`

## Usage

Click the "Start Recording" button to start recording audio. The transcriptions will appear in the "Transcription" box as they're received. Click the "Stop Recording" button to stop recording.

As audio is sent to the backend for transcription, we utilize GPT-3.5-turbo / GPT-4 to format the latest transcription as a CSV or ignore the data if it does not contain any relevant information. In the initial usecase, we are asking GPT to extract guests and gifts. 

This data can then be used elsewhere. 

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)


- Real-time audio recording and transcription using OpenAI's Whisper
- Natural language processing to extract gift and gift-giver information
- Automatic thank you card message generation using OpenAI's GPT-4 LLM
- Interactive user interface for real-time review and editing of transcriptions, gift details, and thank you messages
- WebSocket-based communication for live streaming and processing of audio and transcriptions

## Running locally
1. Install ffmpeg using `brew install ffmpeg`
- [ffmpeg](https://ffmpeg.org/) is a free audio conversion/streaming tool.

2. Setup Frontend `cd frontend && npm install`

3. Setup Backend `cd backend && npm install`
