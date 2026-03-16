import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

interface Props {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

function getErrorMessage(e: unknown): string {
  if (!window.isSecureContext) {
    return 'Camera requires HTTPS. Make sure you are accessing the app via https://.';
  }
  const err = e as { name?: string; message?: string };
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Camera permission denied. Please allow camera access in your browser settings and try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is in use by another app. Close it and try again.';
    case 'OverconstrainedError':
      return 'Could not access the rear camera. Try again.';
    case 'TypeError':
      return 'Camera API not available. Make sure you are using HTTPS.';
    default:
      return `Camera error: ${err?.name ?? 'unknown'} — ${err?.message ?? ''}`.trim();
  }
}

export default function BarcodeScannerModal({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    detectedRef.current = false;
    setError(null);
    setLoading(true);

    let cancelled = false;

    (async () => {
      try {
        // Request rear camera explicitly
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        setLoading(false);

        const reader = new BrowserMultiFormatReader();
        // decodeFromStream keeps decoding frames until stopped
        reader.decodeFromStream(stream, video, (result) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            onDetected(result.getText());
            onClose();
          }
        });
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      BrowserMultiFormatReader.releaseAllStreams();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const handleClose = () => {
    BrowserMultiFormatReader.releaseAllStreams();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      <DialogTitle sx={{ pb: 1 }}>Scan Barcode</DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {error ? (
          <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
            <Typography color="error" gutterBottom>{error}</Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* playsInline + muted required for iOS Safari autoplay */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {loading && (
              <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <CircularProgress sx={{ color: '#fff' }} />
                <Typography sx={{ color: '#fff' }} variant="body2">Starting camera…</Typography>
              </Box>
            )}
            {!loading && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '70%',
                maxWidth: 280,
                aspectRatio: '3/2',
                border: '2px solid rgba(255,255,255,0.6)',
                borderRadius: 1,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                pointerEvents: 'none',
              }}>
                {['top left', 'top right', 'bottom left', 'bottom right'].map(pos => {
                  const [v, h] = pos.split(' ');
                  return (
                    <Box key={pos} sx={{
                      position: 'absolute',
                      width: 20, height: 20,
                      [v]: -2, [h]: -2,
                      borderTop: v === 'top' ? '3px solid #fff' : 'none',
                      borderBottom: v === 'bottom' ? '3px solid #fff' : 'none',
                      borderLeft: h === 'left' ? '3px solid #fff' : 'none',
                      borderRight: h === 'right' ? '3px solid #fff' : 'none',
                    }} />
                  );
                })}
              </Box>
            )}
          </Box>
        )}
        {!error && !loading && (
          <Typography variant="body2" sx={{ textAlign: 'center', py: 1.5, color: 'text.secondary' }}>
            Point camera at a barcode
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} fullWidth>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
