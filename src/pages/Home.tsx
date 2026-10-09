import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { freePrompts } from '../content/prompts';
import PromptCard from '../components/PromptCard';
import Signup from '../components/Signup';
import styles from './Home.module.css';

// From the 70.3 Michigan (Frankfort) race analysis, 2026-09-20. Minutes lost on land vs a sub-5 day.
const lost = [
  { leg: 'Bike', minutes: 10, note: 'Dropped chain on the first climb, then a cramping last quarter', color: 'var(--bike)' },
  { leg: 'Run', minutes: 7, note: 'Stops at mile 4 (cramps) and mile 9', color: 'var(--run)' },
  { leg: 'Transitions', minutes: 6, note: 'Calf cramps stripping the wetsuit in T1', color: 'var(--swim)' },
];
const maxLost = Math.max(...lost.map((l) => l.minutes));

export default function Home() {
  return (
    <>
      <title>AI Tri Coach</title>
      <section className={`${styles.hero} wrap section stack`}>
        <p className={styles.eyebrow}>Missed sub-5. Starting over with an AI coach.</p>
        <h1>The exact prompts I use to have Claude coach my triathlon training.</h1>
        <p className={`${styles.lede} muted`}>
          I'm a frontend developer and age-group triathlete. After missing sub-5 at 70.3 Michigan, I'm letting Claude
          coach me to a rematch and then my first Ironman, using my real training data. This is the setup, free to
          copy.
        </p>
        <div className={styles.actions}>
          <Link className={styles.button} to="/kit" viewTransition>Get the free starter kit</Link>
          <Link to="/#signup">Follow the build</Link>
        </div>
      </section>

      {/*
        TODO(James): the swim/bike/run course line. Plan: an SVG path that draws with a scroll-driven
        animation (animation-timeline: view()) and reveals each leg's minutes as it passes.
      */}
      <section className="wrap section stack" aria-labelledby="lost-heading">
        <h2 id="lost-heading">Where the 23 minutes went</h2>
        <p className="muted">
          The first thing I asked Claude was where my race went wrong. I was 7th out of the water and finished 46th.
          All of the time was lost on land.
        </p>
        <ol className={styles.lost}>
          {lost.map((l) => (
            <li key={l.leg} style={{ '--share': l.minutes / maxLost, '--leg': l.color } as CSSProperties}>
              <span className={styles.leg}>{l.leg}</span>
              <span className={styles.bar} aria-hidden="true" />
              <span className={styles.mins}>~{l.minutes} min</span>
              <span className={`${styles.note} muted`}>{l.note}</span>
            </li>
          ))}
        </ol>
        <p><Link to="/prompts/race-debrief" viewTransition>The debrief prompt I used</Link></p>
      </section>

      <section className="wrap section stack" aria-labelledby="kit-heading">
        <h2 id="kit-heading">The starter kit</h2>
        <p className="muted">Four prompts and a setup guide. One evening to set up, then a few minutes a week.</p>
        <div className={styles.grid}>
          {freePrompts.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} />)}
        </div>
      </section>

      <div className="wrap section">
        <Signup />
      </div>
    </>
  );
}
