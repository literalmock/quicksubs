import PQueue from 'p-queue';

const RETRY_DELAYS_MS = [1000, 3000, 5000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createTranscriptionQueue = (concurrency = 3) =>
  new PQueue({ concurrency });

export const processChunksWithRetry = async ({
  chunks,
  processChunk,
  concurrency = 3,
}) => {
  const queue = createTranscriptionQueue(concurrency);
  const manualReview = [];

  const tasks = chunks.map((chunk) =>
    queue.add(async () => {
      let lastError = null;

      for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
        try {
          const transcription = await processChunk(chunk);
          const text = String(transcription?.text || '').trim();
          if (!text) throw new Error('Empty transcription text');
          return { chunk, transcription };
        } catch (err) {
          lastError = err;
          if (attempt < RETRY_DELAYS_MS.length - 1) {
            await sleep(RETRY_DELAYS_MS[attempt]);
          }
        }
      }

      manualReview.push({
        file: chunk.file,
        offset: chunk.offset,
        reason: lastError?.message || 'Transcription failed',
      });

      return {
        chunk,
        transcription: { text: '', words: [], segments: [] },
      };
    })
  );

  const results = await Promise.all(tasks);
  results.sort((a, b) => a.chunk.offset - b.chunk.offset);

  return { results, manualReview };
};
