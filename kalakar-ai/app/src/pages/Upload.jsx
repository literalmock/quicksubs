import { useNavigate } from 'react-router-dom';
import UploadZone from '../components/UploadZone';

const Upload = () => {
  const navigate = useNavigate();

  const handleUploadComplete = () => {
    navigate('/dashboard');
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Upload Video</h2>
        <p className="text-surface-500 text-sm mt-1">
          Upload a video and we&apos;ll auto-generate captions using AI.
        </p>
      </div>

      <UploadZone onUploadComplete={handleUploadComplete} />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '⬆️', title: 'Upload', desc: 'Drag & drop or select a video file' },
          { icon: '🧠', title: 'AI Transcription', desc: 'Whisper AI extracts speech and generates subtitles' },
          { icon: '🎬', title: 'Download', desc: 'Get your video with burned-in captions' },
        ].map((step, i) => (
          <div key={i} className="bg-surface-800/40 rounded-xl border border-surface-700 p-6 text-center">
            <span className="text-3xl block mb-3">{step.icon}</span>
            <h4 className="font-medium text-sm mb-1">{step.title}</h4>
            <p className="text-xs text-surface-500">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Upload;
