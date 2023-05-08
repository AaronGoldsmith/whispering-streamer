# Wedding Gift Thank You Card Assistant

A web application that streamlines the thank you card process by automatically transcribing gift opening audio and generating personalized messages for wedding gifts.

## Features

- Real-time audio recording and transcription using OpenAI's Whisper ASR
- Natural language processing to extract gift and gift-giver information
- Automatic thank you card message generation using OpenAI's GPT-4 LLM
- Interactive user interface for real-time review and editing of transcriptions, gift details, and thank you messages
- WebSocket-based communication for live streaming and processing of audio and transcriptions

## Project Outline & Checklist

### 1. Project Setup

- [ ] Initialize a new project repository
- [ ] Choose frontend and backend frameworks
- [ ] Setup project directory structure

### 2. Frontend

- [ ] Implement audio recording functionality using Web Audio API or Recorder.js
- [ ] Design UI components for audio recording and playback, live transcription display, and editing gift and gift-giver details
- [ ] Implement a "Live Mode" toggle button to activate real-time audio streaming and transcription processing
- [ ] Add WebSocket connection logic for real-time communication with the backend

### 3. Backend
- [ ] See [Backend](../backend/README.md)

### 4. Real-time Transcription Processing

- [ ] Modify frontend to automatically send audio segments to the backend every 30 seconds while in "Live Mode"
- [ ] Display real-time transcriptions, gift-givers, and gifts in the frontend UI for user review and editing

### 5. Testing and Deployment

- [ ] Perform unit and integration testing of individual components
- [ ] Conduct end-to-end testing of the application with real users
- [ ] Deploy the application to a hosting provider (e.g., AWS, Heroku, etc.)

### 6. Documentation

- [ ] Write user documentation for application usage and features
- [ ] Create developer documentation for future maintenance and updates


## CRA Template: 

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
