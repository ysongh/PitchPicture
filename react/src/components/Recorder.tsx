import { useEffect, useRef, useState } from 'react';

const MAX_SECONDS = 30 * 60;
const WARN_SECONDS = 25 * 60;
const MIME = 'audio/webm;codecs=opus';
const BITRATE = 64_000;

type Phase = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

interface Props {
  onStop: (blob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function Recorder({ onStop, disabled }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      tickRef.current && window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    setPhase('requesting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API not available in this browser.');
      }
      if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(MIME)) {
        throw new Error(`Browser does not support ${MIME}.`);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const rec = new MediaRecorder(stream, {
        mimeType: MIME,
        audioBitsPerSecond: BITRATE,
      });
      recorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: MIME });
        const duration = seconds;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (tickRef.current) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setPhase('stopped');
        onStop(blob, duration);
      };

      rec.start(1000);
      setSeconds(0);
      setPhase('recording');
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS && recorderRef.current?.state === 'recording') {
            recorderRef.current.stop();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes('Permission') || msg.includes('denied')
          ? 'Microphone access denied. Allow it in your browser and try again.'
          : msg
      );
      setPhase('error');
    }
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }

  const warning = seconds >= WARN_SECONDS && seconds < MAX_SECONDS;

  return (
    <div className="recorder">
      <div className={`timer ${phase === 'recording' ? 'live' : ''}`}>
        {fmt(seconds)}
      </div>

      {phase === 'idle' && (
        <button type="button" className="primary big" onClick={start} disabled={disabled}>
          Start recording
        </button>
      )}

      {phase === 'requesting' && <p>Requesting microphone…</p>}

      {phase === 'recording' && (
        <>
          <button type="button" className="primary big" onClick={stop}>
            Stop
          </button>
          {warning && (
            <p className="warn">
              Recording will auto-stop at {fmt(MAX_SECONDS)} ({fmt(MAX_SECONDS - seconds)} left).
            </p>
          )}
        </>
      )}

      {phase === 'stopped' && <p>Recording stopped.</p>}

      {phase === 'error' && error && <p className="error">{error}</p>}
    </div>
  );
}
