import { Link, useParams } from 'react-router';
import { getFreePrompt } from '../content/prompts';
import CopyButton from '../components/CopyButton';
import PromptText from '../components/PromptText';
import NotFound from './NotFound';
import styles from './PromptPage.module.css';

export default function PromptPage() {
  // Only free prompts get public pages; paid ones will live behind the membership.
  const prompt = getFreePrompt(useParams().id);
  if (!prompt) return <NotFound />;

  return (
    <article
      className={`${styles.page} wrap section stack`}
      style={{ viewTransitionName: `prompt-${prompt.id}` }}
    >
      <title>{`${prompt.title} · AI Tri Coach`}</title>
      <meta name="description" content={prompt.summary} />
      <p className={styles.num}>Prompt {prompt.order}</p>
      <h1>{prompt.title}</h1>
      <p className="muted">{prompt.summary}</p>
      <p><strong>Use it:</strong> {prompt.useWhen}</p>
      <PromptText body={prompt.body} />
      <CopyButton text={prompt.body} />
      <p><Link to="/kit" viewTransition>See the full starter kit</Link></p>
    </article>
  );
}
