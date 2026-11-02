import { useEffect, useRef, useState } from 'react';
import { draw } from './draw';
import './WatchFacePreview.css';

type Props = {
  /** Show the Active / Always-on switch under the watch. */
  controls?: boolean;
  /** Accessible name for the live preview. */
  label?: string;
};

/**
 * A live preview of the SD Digital Tri face: the same canvas drawing as the mockup, ticking every second.
 * Sample data (steps, weather, weekly rings) is made up; the time and date are the viewer's.
 */
export default function WatchFacePreview({ controls = true, label = 'SD Digital Tri watch face, live preview' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [aod, setAod] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let timer: number | undefined;
    const frame = () => draw(el, new Date(), aod);
    // Draw once right away, again when the watch font arrives, then every second.
    frame();
    document.fonts?.ready.then(frame);
    timer = window.setInterval(frame, 1000);
    return () => window.clearInterval(timer);
  }, [aod]);

  return (
    <figure className="wf">
      <div className="wf-bezel" data-aod={aod || undefined}>
        <canvas ref={canvas} width={454} height={454} role="img" aria-label={`${label}${aod ? ', always-on mode' : ''}`} />
      </div>
      {controls && (
        <figcaption className="wf-modes" role="group" aria-label="Display mode">
          <button type="button" aria-pressed={!aod} onClick={() => setAod(false)}>
            Active
          </button>
          <button type="button" aria-pressed={aod} onClick={() => setAod(true)}>
            Always-on
          </button>
        </figcaption>
      )}
    </figure>
  );
}
