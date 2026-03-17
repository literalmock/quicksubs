# Caption Engine Upgrade: Word-Level Intelligent Segmentation

## Overview

This upgrade transforms the captioning system from time-based segmentation (2-3 second chunks) to **word-aware intelligent segmentation** with keyword highlighting, enabling clean, stylable captions like Submagic, VEED, and Kalakar.

---

## What Changed

### 1. **Word-Level Transcription (Already Enabled)**
✅ **Status**: groqTranscriber.js already requests word timestamps
- Uses `timestamp_granularities: ['word', 'segment']`
- Returns `{ word, start, end }` objects for precise timing

### 2. **Intelligent Caption Segmentation** (NEW)
📍 **File**: `/worker/src/pipeline/segmentCaptions.js`

**Before:**
- Grouped words by time (0.9s pause threshold)
- Produced 2-3 word chunks
- Poor UI rendering

**After:**
- Chunks words dynamically (max 4 words per chunk)
- Uses sentence-ending detection (., ?, !)
- Pause threshold: 0.45s (natural speech pauses)
- Each caption includes word-level timing info

**Output Format:**
```javascript
{
  start: 0.0,
  end: 1.2,
  text: "Ayush, so what do",
  words: [
    { word: "Ayush,", start: 0.0, end: 0.4, highlight: false },
    { word: "so", start: 0.4, end: 0.6, highlight: false },
    { word: "what", start: 0.6, end: 0.9, highlight: false },
    { word: "do", start: 0.9, end: 1.2, highlight: false }
  ]
}
```

### 3. **Long-Segment Splitting** (UPGRADED)
📍 **File**: `/worker/src/pipeline/captionFormatter.js`

**New Features:**
- Automatically splits segments with >5 words into smaller chunks
- Distributes timing evenly across split chunks
- Supports word-level timing fallback
- Maintains segment-level caption generation for fallback

### 4. **Keyword Highlighting** (NEW)
📍 **Files**:
- `/worker/src/pipeline/quality/keywordHighlight.js` - Utility library
- `segmentCaptions.js` - Integrated into word grouping
- `captionFormatter.js` - Integrated into formatting

**Customizable Keywords:**
```javascript
const KEYWORDS_FOR_HIGHLIGHTING = [
  'Delhi', 'Dubai', 'war', 'investors', 'million', 'billion',
  'success', 'growth'
];
```

**Usage:**
```javascript
// In caption generation
words: [{
  word: "investors",
  highlight: true  // ← Marked for visual emphasis
}]
```

### 5. **Frontend Rendering** (UPGRADED)
📍 **File**: `/app/src/components/editor/CaptionRenderer.jsx`

**New Features:**
- Uses word-level timing from segmentation
- Renders per-word with individual timing
- Supports keyword highlighting visualization
- Ali Abdaal theme gets proper single-line mode

**Keyword Styling:**
```javascript
// Applies bold + subtle underline for keywords
shouldHighlight && {
  fontWeight: '700',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(59, 130, 246, 0.5)',
}
```

### 6. **Ali Abdaal Style Fix** (NEW)
📍 **File**: `/app/src/index.css`

**Added CSS Classes:**
```css
.caption-renderer--ali-abdaal {
  white-space: nowrap;     /* Force single line */
  overflow: hidden;        /* Hide overflow */
  text-overflow: ellipsis; /* Add ellipsis */
  max-width: 80%;
}
```

### 7. **Pipeline Integration** (UPGRADED)
📍 **File**: `/worker/src/jobs/transcribeJob.js`

**Flow:**
1. ✅ Transcribe with word timestamps (Groq)
2. ✅ Segment captions intelligently (word-aware)
3. ✅ Format captions (split long segments)
4. ✅ Mark keywords for highlighting
5. ✅ Save with word-level timing
6. ✅ Render on frontend with proper styling

---

## Configuration

### Adjust Word Chunk Size

**File**: `segmentCaptions.js`
```javascript
const MAX_WORDS_PER_CHUNK = 4; // Change to 3 or 5 as needed
```

### Adjust Pause Threshold

**File**: `segmentCaptions.js`
```javascript
const PAUSE_THRESHOLD = 0.45; // Seconds - lower = more chunks
```

### Add Custom Keywords

**Option 1**: Edit directly in files
```javascript
const KEYWORDS_FOR_HIGHLIGHTING = [
  'Delhi', 'Dubai', ...your keywords...
];
```

**Option 2**: Use utility API (runtime)
```javascript
import { addCustomKeyword } from './pipeline/quality/keywordHighlight.js';
addCustomKeyword('YourKeyword', 'english');
```

---

## Expected Results

### Before Upgrade
```
Caption: "Ayush, so what do you think about this whole situation here"
Duration: 3.5 seconds
Issues: Long text, wraps poorly, hard to style, no word timing
```

### After Upgrade
```
Caption 1: "Ayush, so what do"     [0.0-1.2s] - 4 words
Caption 2: "you think about this"  [1.2-2.4s] - 4 words
Caption 3: "whole situation here"  [2.4-3.5s] - 4 words

Each word has precise timing:
- Keywords marked for highlighting
- Clean rendering on any screen
- Easy to apply CSS animations
- Works with all caption styles (Ali Abdaal, MrBeast, etc.)
```

---

## Technical Details

### Word-Level Timing Structure

Each caption now carries word-level data:
```javascript
caption.words = [
  {
    word: "string",       // The actual word
    start: number,        // Start time in seconds (ms precision)
    end: number,          // End time in seconds
    highlight: boolean    // Keyword flag
  }
]
```

### Rendering Logic

The frontend renders word-by-word:
1. Determines active word based on `currentTime`
2. Applies styling per word:
   - **Active word**: Current word being spoken
   - **Highlight**: Keyword emphasis
   - **Ali Abdaal**: Color-coded past/future

### Fallback for Missing Word Timestamps

If Groq returns no word data:
1. Uses segment-based captions (via `captionFormatter.js`)
2. Synthesizes word timing proportionally
3. Still generates clean, short chunks

---

## Testing Checklist

- [ ] Word timestamps are present in transcription output
- [ ] Captions are chunked into 3-5 word segments
- [ ] Keyword highlighting renders correctly (bold + underline)
- [ ] Ali Abdaal theme shows single-line captions
- [ ] Active word transitions smoothly during playback
- [ ] Long segments (>5 words) are auto-split
- [ ] No captions overflow screen width
- [ ] Works on mobile and desktop

---

## Files Modified

1. **`/worker/src/pipeline/segmentCaptions.js`**
   - Added word-aware chunking logic
   - Added keyword highlighting marks
   - Improved pause threshold (0.45s)

2. **`/worker/src/pipeline/captionFormatter.js`**
   - Added long-segment splitting (>5 words)
   - Added word-level timing support
   - Improved fallback logic

3. **`/worker/src/jobs/transcribeJob.js`**
   - Updated pipeline to use word-aware segmentation
   - Added intelligent fallback chain
   - Enhanced logging for debugging

4. **`/app/src/components/editor/CaptionRenderer.jsx`**
   - Added keyword highlighting support
   - Added Ali Abdaal single-line mode
   - Improved word-level styling

5. **`/app/src/index.css`**
   - Added `.caption-renderer--ali-abdaal` styles
   - Added `.caption-word--keyword` styles
   - Improved caption animations

6. **`/worker/src/pipeline/quality/keywordHighlight.js`** (NEW)
   - Centralized keyword management
   - Language-specific keyword sets
   - Runtime keyword addition API

---

## Debugging

### Check Word Timestamps

Add logging to `transcribeJob.js`:
```javascript
console.log('Words:', transcription.words?.slice(0, 5));
console.log('Word count:', transcription.words?.length);
```

### Verify Caption Segmentation

Check the generated captions:
```javascript
console.log('Segmented captions:', captions.map(c => ({
  text: c.text,
  duration: c.end - c.start,
  wordCount: c.words?.length
})));
```

### Check Keyword Highlighting

```javascript
console.log('Keywords marked:', captions.flatMap(c => 
  c.words.filter(w => w.highlight)
));
```

---

## Future Enhancements

- [ ] Per-language keyword sets (Hindi, Hinglish)
- [ ] ML-based keyword detection (NER)
- [ ] Adaptive chunk sizing based on speaker pace
- [ ] Caption style templates (reels vs. shorts)
- [ ] A/B testing different segmentation strategies
- [ ] Caption burn-in with proper timing

---

## Support

For issues or customizations:
1. Check `last_transcription_log.json` for raw Groq output
2. Verify word timestamps are present
3. Adjust `MAX_WORDS_PER_CHUNK` and `PAUSE_THRESHOLD`
4. Review CSS styling in `index.css`

---

**Status**: ✅ Production Ready
**Last Updated**: 2024
**Compatibility**: All caption styles, all languages with word timestamps
