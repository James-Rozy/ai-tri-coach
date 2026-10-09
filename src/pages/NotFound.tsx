import { Link } from 'react-router';

export default function NotFound() {
  return (
    <section className="wrap section stack">
      <title>Not found · AI Tri Coach</title>
      <h1>That page isn't here.</h1>
      <p><Link to="/">Back to the home page</Link></p>
    </section>
  );
}
