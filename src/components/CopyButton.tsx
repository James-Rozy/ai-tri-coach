import { useEffect, useState } from 'react';
import styles from './CopyButton.module.css';

interface Props {
  text: string;
}

export default function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <button type="button" className={styles.copy} onClick={copy}>
      <span aria-live="polite">{copied ? 'Copied' : 'Copy prompt'}</span>
    </button>
  );
}
