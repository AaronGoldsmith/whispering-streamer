const fs = require('fs');

function readMP3File(filepath) {
  try {
    return fs.createReadStream(filepath);
  } catch (error) {
    throw new Error(`Unable to read file at ${filepath}: ${error.message}`);
  }
}

async function transcribeAudio(openai, stream) {
  try {
    const resp = await openai.createTranscription(stream, 'whisper-1','English only.');
    return resp.data.text;
  } catch (error) {
    throw new Error(`Unable to create transcription: ${error.message}`);
  }
}

/**
 * Transcribes an audio file in MP3 format using OpenAI API.
 *
 * @async
 * @function processMP3
 * @param {string} filepath - The path to the MP3 file to be transcribed.
 * @throws {Error} If the file path is invalid or there is an error in the transcription process.
 * @returns {Promise<string>} A Promise that resolves with the transcription result.
 */
async function processMP3(openai, filepath) {
  const stream = readMP3File(filepath);
  let transcription = '';
  try {
    transcription = await transcribeAudio(openai, stream);
  } catch (error) {
    console.error('Error during transcription:', error);
  }
  return transcription;
}

module.exports = {
  processMP3,
};
