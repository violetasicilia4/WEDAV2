import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FindWedding } from "@/components/find-wedding";
import "@/encontrar.css";

export const Route = createFileRoute("/encontrar")({
  head: () => ({
    meta: [
      { title: "Encontrá tu casamiento • Weda" },
      {
        name: "description",
        content:
          "Buscá por los nombres de la pareja y encontrá el espacio de su gran día. Demostración con casamientos ficticios.",
      },
      // Es una demostración con datos ficticios: no debe indexarse.
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Encontrá tu casamiento • Weda" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_AR" },
    ],
  }),
  component: FindWeddingPage,
});

function FindWeddingPage() {
  return (
    <div className="fw-page">
      <a className="skip-link" href="#main">
        Ir al contenido
      </a>
      <header className="fw-top">
        <Link to="/" className="seed-logo" aria-label="Weda, volver a la página principal">
          Weda
          <i aria-hidden="true" />
        </Link>
        <Link to="/" className="fw-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver
        </Link>
      </header>
      <main id="main">
        <FindWedding />
      </main>
      <footer className="fw-foot">© 2026 Weda · Demostración con datos ficticios</footer>
    </div>
  );
}
