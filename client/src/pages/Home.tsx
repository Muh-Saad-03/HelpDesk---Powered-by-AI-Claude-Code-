import { useEffect, useState } from "react";
import { NavBar } from "../components/NavBar";

type HealthResponse = { status: string; uptime: number };

export function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <NavBar />
      <main className="home">
        <h1>Welcome</h1>
        {error ? (
          <p>Server unreachable: {error}</p>
        ) : health ? (
          <p>
            Server is {health.status} (uptime: {health.uptime.toFixed(1)}s)
          </p>
        ) : (
          <p>Checking server...</p>
        )}
      </main>
    </>
  );
}
