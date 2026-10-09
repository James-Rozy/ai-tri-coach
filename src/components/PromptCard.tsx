import { Link } from 'react-router';
import type { Prompt } from '../content/prompts';
import styles from './PromptCard.module.css';

export default function PromptCard({ prompt }: { prompt: Prompt }) {
  return (
    <article className={styles.card} style={{ viewTransitionName: `prompt-${prompt.id}` }}>
      <p className={styles.num}>Prompt {prompt.order}</p>
      <h3>
        <Link to={`/prompts/${prompt.id}`} viewTransition>
          {prompt.title}
        </Link>
      </h3>
      <p className="muted">{prompt.summary}</p>
    </article>
  );
}
