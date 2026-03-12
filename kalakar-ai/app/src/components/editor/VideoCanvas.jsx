import { useCallback, useEffect, useRef, useState } from 'react';
import SubtitleOverlay from './SubtitleOverlay';

/** Reference resolution that ASS uses (PlayResX/PlayResY). */
const REF_W = 1920;
const REF_H = 1080;

const VideoCanvas = ({
  videoSrc,
  videoRef,
  activeSubtitle,
  onLoadedMetadata,
  onPause,
  onEnded,
  onUpdateStyle,
  onTogglePlay,
}) => {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 450 });
  const [nativeSize, setNativeSize] = useState({ width: 0, height: 0 });

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Grab native video dimensions once loaded
  const handleMeta = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      const vw = v.videoWidth || REF_W;
      const vh = v.videoHeight || REF_H;
      setNativeSize({ width: vw, height: vh });
      onLoadedMetadata(vw, vh);
    }
  }, [onLoadedMetadata, videoRef]);

  // Compute the actual displayed video rect (object-contain logic)
  const cw = containerSize.width;
  const ch = containerSize.height;
  const vw = nativeSize.width || REF_W;
  const vh = nativeSize.height || REF_H;

  const scale = Math.min(cw / vw, ch / vh);
  const displayW = Math.round(vw * scale);
  const displayH = Math.round(vh * scale);
  const offsetX = Math.round((cw - displayW) / 2);
  const offsetY = Math.round((ch - displayH) / 2);

  // Scale factor: ASS font sizes are relative to PlayResY (height), so we must
  // scale by display height / native height to match the burned output exactly.
  const fontScale = displayH / vh;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-xl overflow-hidden"
    >
      {/* HTML5 video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 w-full h-full object-contain"
        onLoadedMetadata={handleMeta}
        onPause={onPause}
        onEnded={onEnded}
        playsInline
      />

      {/* Click-to-toggle-play — behind the caption overlay */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={onTogglePlay}
      />

      {/* HTML caption overlay — sits exactly over the displayed video area */}
      {activeSubtitle && (
        <div
          className="absolute z-20"
          style={{
            left: offsetX,
            top: offsetY,
            width: displayW,
            height: displayH,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <SubtitleOverlay
            subtitle={activeSubtitle}
            containerWidth={displayW}
            containerHeight={displayH}
            fontScale={fontScale}
            onUpdateStyle={onUpdateStyle}
          />
        </div>
      )}
    </div>
  );
};

export default VideoCanvas;
