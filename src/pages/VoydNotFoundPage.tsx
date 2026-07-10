import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";

export default function VoydNotFoundPage() {
  return (
    <PageTransition>
      <main className="page not-found-page">
        <p className="eyebrow">404</p>
        <h1>This workspace route does not exist.</h1>
        <p>Return to the VOYD platform and continue exploring the operating system.</p>
        <Button to="/">Back to Platform</Button>
      </main>
    </PageTransition>
  );
}
