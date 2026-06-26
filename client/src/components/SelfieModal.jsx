'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

// Webcam selfie capture. Calls onCapture(blob) when confirmed, or onSkip() to punch without a photo.
export default function SelfieModal({ onCapture, onSkip, onClose, busy }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [shot, setShot] = useState(null); // dataURL preview
  const [blob, setBlob] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      } catch {
        setErr('Camera not available or permission denied. You can punch without a selfie.');
      }
    })();
    return () => { active = false; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL('image/jpeg', 0.8));
    canvas.toBlob((b) => setBlob(b), 'image/jpeg', 0.8);
  };
  const retake = () => { setShot(null); setBlob(null); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Selfie check-in</h3>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>
        {err ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{err}</div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={onSkip}>{busy ? 'Punching…' : 'Punch without selfie'}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl bg-slate-900">
              {shot ? <img src={shot} alt="selfie" className="h-auto w-full" /> : <video ref={videoRef} playsInline muted className="h-auto w-full -scale-x-100" />}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button className="text-sm text-slate-400 hover:text-slate-600" onClick={onSkip} disabled={busy}>Skip selfie</button>
              <div className="flex gap-2">
                {shot
                  ? (<>
                      <button className="btn-outline inline-flex items-center gap-1.5" onClick={retake} disabled={busy}><RefreshCw size={15} /> Retake</button>
                      <button className="btn-primary inline-flex items-center gap-1.5" onClick={() => onCapture(blob)} disabled={busy || !blob}><Check size={15} /> {busy ? 'Punching…' : 'Use photo & punch'}</button>
                    </>)
                  : <button className="btn-primary inline-flex items-center gap-1.5" onClick={capture}><Camera size={15} /> Capture</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
