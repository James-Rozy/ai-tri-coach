import { Link } from 'react-router';
import { freePrompts } from '../content/prompts';
import CopyButton from '../components/CopyButton';
import PromptText from '../components/PromptText';
import styles from './Kit.module.css';

export default function Kit() {
  return (
    <article className={`${styles.kit} wrap section stack`}>
      <title>Free starter kit · AI Tri Coach</title>
      <meta name="description" content="Four prompts and a setup guide for using Claude as your endurance coach." />
      <h1>Coach yourself with AI: the starter kit</h1>
      <p className="muted">
        This is the setup I use with Claude to coach my triathlon training. It's not a training plan. It's how to get
        an AI to build one from your own data, explain why, and tell you when you're off track. You'll need a Claude
        account, your Strava or Garmin history, and a goal race.
      </p>

      <h2>Setup</h2>
      <ol className={styles.steps}>
        <li>
          <strong>Make a project for your training.</strong> In Claude, create a Project called "Training" and paste
          Prompt 1 into its instructions. Everything you add later builds on it.
        </li>
        <li>
          <strong>Give it your data.</strong> Connect Strava if your Claude plan offers the connector, or export your
          last 3 to 6 months of activities as CSV and upload them to the project.
        </li>
        <li><strong>Run the prompts below in order</strong>, then use the weekly check-in every week.</li>
      </ol>

      {freePrompts.map((prompt) => (
        <section key={prompt.id} className={`${styles.prompt} stack`} id={prompt.id}>
          <header className={styles.head}>
            <h2>{prompt.order}. {prompt.title}</h2>
            <CopyButton text={prompt.body} />
          </header>
          <p className="muted">Use it: {prompt.useWhen}</p>
          <PromptText body={prompt.body} />
        </section>
      ))}

      <h2>What's next</h2>
      <p>
        I'm posting the real prompts and Claude's answers from every week of my build to an Ironman, the good weeks
        and the bad ones. <Link to="/#signup">Follow along.</Link>
      </p>
    </article>
  );
}
