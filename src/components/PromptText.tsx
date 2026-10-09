import Markdown from 'react-markdown';
import styles from './PromptText.module.css';

export default function PromptText({ body }: { body: string }) {
  return (
    <div className={styles.text}>
      <Markdown>{body}</Markdown>
    </div>
  );
}
