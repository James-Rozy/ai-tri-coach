import styles from './Signup.module.css';

export default function Signup() {
  return (
    <section id="signup" className={`${styles.signup} stack`}>
      <h2>Follow the build</h2>
      <p>
        Every other Sunday: the new episode and one prompt from that week of training, including the weeks that go
        badly.
      </p>
      {/* TODO: point this at the email provider once it's picked. Disabled until then. */}
      <form className={styles.form} aria-describedby="signup-note" onSubmit={(e) => e.preventDefault()}>
        <label className="visually-hidden" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required disabled />
        <button type="submit" disabled>Join</button>
      </form>
      <p id="signup-note" className="muted">Signup opens soon.</p>
    </section>
  );
}
