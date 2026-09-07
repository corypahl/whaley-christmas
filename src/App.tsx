import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ArrowRight, Gift, Heart, Sprout } from "lucide-react";
import { people, personBySlug } from "./data";
import { PersonList } from "./PersonList";

function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-mark"><Sprout aria-hidden="true" /></div>
        <h1>Whaley Christmas</h1>
      </section>

      <div className="family-groups">
        {([1, 2, 3] as const).map((generation) => (
          <section className="generation" key={generation}>
            <div className="section-heading">
              <h2>Gen{generation}</h2>
            </div>
            <div className={`people-grid generation-${generation}`}>
              {people.filter((person) => person.generation === generation).map((person, index) => (
                <Link className="person-card" to={`/${person.slug}`} key={person.slug} style={{ "--delay": `${index * 35}ms` } as React.CSSProperties}>
                  <span className="gift-icon"><Gift size={19} strokeWidth={1.8} /></span>
                  <span>{person.name}</span>
                  <ArrowRight className="card-arrow" size={17} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer><Heart size={14} fill="currentColor" /> Made for the Whaley family</footer>
    </main>
  );
}

function ListRoute() {
  const { slug = "" } = useParams();
  const person = personBySlug.get(slug);
  return person ? <PersonList person={person} /> : <Navigate to="/" replace />;
}

export default function App() {
  return <Routes><Route path="/" element={<Home />} /><Route path="/:slug" element={<ListRoute />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
