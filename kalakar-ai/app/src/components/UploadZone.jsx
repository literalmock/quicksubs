import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../api/axios';

const LANGUAGE_OPTIONS = [
  {
    value: 'hinglish',
    label: 'Hinglish',
    desc: 'Hindi + English mixed (Roman script)',
    flag: '🇮🇳🇬🇧',
  },
  {
    value: 'english',
    label: 'English',
    desc: 'English only',
    flag: '🇬🇧',
  },
];

const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB
const CLOUDINARY_DIRECT_LIMIT = 100 * 1024 * 1024; // 100 MB account cap on current plan
const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB chunks

const formatFileSize = (size) => {
  if (!size) return '0 MB';
  const mb = size / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

const getLanguageLabel = (value) =>
  LANGUAGE_OPTIONS.find((option) => option.value === value)?.label || 'Hinglish';

/**
 * Upload a single chunk to Cloudinary with Content-Range header.
 * Returns parsed JSON response (final chunk returns full upload result).
 */
const uploadChunk = (url, formData, chunk, start, end, total, uniqueId) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${total}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const errBody = JSON.parse(xhr.responseText);
          reject(new Error(errBody.error?.message || 'Chunk upload failed'));
        } catch {
          reject(new Error('Chunk upload failed'));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));

    const data = new FormData();
    for (const [key, val] of formData.entries()) data.append(key, val);
    data.append('file', chunk);
    xhr.send(data);
  });

const UploadZone = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState('hinglish');
  const [pendingFile, setPendingFile] = useState(null);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [activeUpload, setActiveUpload] = useState(null);

  const closeLanguagePopup = () => {
    if (uploading) return;
    setShowLanguagePopup(false);
    setPendingFile(null);
  };

  const startUpload = useCallback(async (file, selectedLanguage) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 250 MB.');
      return;
    }

    setActiveUpload({
      name: file.name,
      size: file.size,
      language: selectedLanguage,
    });
    setUploading(true);
    setProgress(0);
    setPhase('uploading');
    setError(null);

    try {
      let cloudData;

      if (file.size > CLOUDINARY_DIRECT_LIMIT) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('language', selectedLanguage);

        const { data } = await api.post('/video/upload-local', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
          },
        });

        setPhase('registering');
        setProgress(100);
        onUploadComplete?.(data.video);
        return;
      }

      const { data: sig } = await api.get('/video/upload-signature');
      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`;

      const baseParams = new FormData();
      baseParams.append('api_key', sig.apiKey);
      baseParams.append('timestamp', sig.timestamp);
      baseParams.append('signature', sig.signature);
      baseParams.append('folder', sig.folder);
      baseParams.append('resource_type', 'video');

      if (file.size <= CHUNK_SIZE) {
        const formData = new FormData();
        for (const [key, val] of baseParams.entries()) formData.append(key, val);
        formData.append('file', file);

        cloudData = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded * 100) / e.total));
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              try {
                const errBody = JSON.parse(xhr.responseText);
                reject(new Error(errBody.error?.message || 'Cloudinary upload failed'));
              } catch {
                reject(new Error('Cloudinary upload failed'));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(formData);
        });
      } else {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const totalSize = file.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        let uploaded = 0;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, totalSize);
          const chunk = file.slice(start, end);

          const result = await uploadChunk(uploadUrl, baseParams, chunk, start, end, totalSize, uniqueId);
          uploaded += end - start;
          setProgress(Math.round((uploaded * 100) / totalSize));

          if (i === totalChunks - 1) cloudData = result;
        }
      }

      setPhase('registering');
      setProgress(100);
      const { data } = await api.post('/video/register', {
        cloudinaryUrl: cloudData.secure_url,
        cloudinaryPublicId: cloudData.public_id,
        title: file.name,
        language: selectedLanguage,
      });

      onUploadComplete?.(data.video);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setPhase('');
      setPendingFile(null);
      setShowLanguagePopup(false);
      setActiveUpload(null);
    }
  }, [onUploadComplete]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setPendingFile(file);
    setShowLanguagePopup(true);
  }, []);

  const confirmLanguageAndUpload = async () => {
    if (!pendingFile || uploading) return;
    const file = pendingFile;
    const selectedLanguage = language;
    setShowLanguagePopup(false);
    await startUpload(file, selectedLanguage);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-primary-400 bg-primary-600/10 scale-[1.02]'
            : uploading
              ? 'border-surface-600 bg-surface-800/50 cursor-wait'
              : 'border-surface-600 hover:border-primary-500 hover:bg-surface-800/30'
        }`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-600/20 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {phase === 'registering' ? 'Upload complete. Starting transcription...' : 'Uploading your video...'}
              </p>
              {activeUpload && (
                <div className="space-y-1">
                  <p className="text-sm text-surface-300 break-all">{activeUpload.name}</p>
                  <p className="text-xs text-surface-500">
                    {formatFileSize(activeUpload.size)} • {getLanguageLabel(activeUpload.language)}
                  </p>
                </div>
              )}
              <p className="text-xs text-surface-500">{progress}% complete</p>
            </div>
            <div className="w-64 mx-auto bg-surface-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-surface-500">
              Keep this page open while we finish the upload and queue transcription.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-800 flex items-center justify-center text-3xl">
              {isDragActive ? '📥' : '🎥'}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop your video here' : 'Drag & drop a video file'}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                or click to browse • MP4, MOV, AVI, MKV, WebM • up to 250 MB
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
      </div>

      {showLanguagePopup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-surface-600 bg-surface-900 shadow-2xl">
            <div className="px-6 py-5 border-b border-surface-700">
              <h3 className="text-lg font-semibold text-surface-100">Choose Subtitle Language</h3>
              <p className="text-sm text-surface-400 mt-1">
                We will generate captions for
                <span className="text-surface-200 font-medium"> {pendingFile?.name}</span>
                {' '}using AI in Roman script.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={uploading}
                    onClick={() => setLanguage(opt.value)}
                    className={`rounded-xl border px-4 py-4 text-left transition-all duration-200 ${
                      language === opt.value
                        ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                        : 'border-surface-600 bg-surface-800/40 text-surface-300 hover:border-surface-500'
                    } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-lg block mb-1">{opt.flag}</span>
                    <span className="text-sm font-medium block">{opt.label}</span>
                    <span className="text-xs text-surface-500">{opt.desc}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeLanguagePopup}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-800 hover:bg-surface-700 text-surface-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLanguageAndUpload}
                  disabled={uploading || !pendingFile}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Starting...' : 'Generate Captions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UploadZone;
