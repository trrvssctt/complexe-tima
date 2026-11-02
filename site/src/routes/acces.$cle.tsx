import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo-complexe-tima.webp";
import { Alert, adminInput } from "@/components/admin/ui";
import { adminLogin, checkLoginKey } from "@/functions/admin";

/**
 * Connexion à l'espace boutique. Aucun lien ne mène ici : l'adresse contient une clé secrète
 * (ADMIN_LOGIN_KEY). Avec une autre clé, la page n'existe pas (404).
 */
export const Route = createFileRoute("/acces/$cle")({
  loader: ({ params }) => checkLoginKey({ data: { key: params.cle } }),
  head: () => ({
    meta: [
      { title: "Connexion — Espace boutique" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { cle } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await adminLogin({ data: { key: cle, email, password, remember } });
      if (res.ok) {
        await navigate({ to: "/admin" });
        return;
      }
      setError(res.error);
      setPassword("");
    } catch {
      setError("Connexion impossible pour le moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-end gap-5 bg-ink p-16 text-ink-foreground lg:flex">
        <img src={logo} alt="" width={96} height={96} className="h-24 w-24" />
        <h1 className="max-w-md text-5xl font-bold leading-tight">
          Gérez vos commandes et votre catalogue.
        </h1>
        <p className="max-w-md text-lg text-ink-foreground/75">
          Un seul endroit pour les commandes du site, les prix et les produits en ligne.
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <form
          onSubmit={submit}
          className="w-full max-w-md space-y-5 rounded-3xl border bg-card p-8 shadow-lift"
        >
          <img
            src={logo}
            alt="Complexe Tima"
            width={64}
            height={64}
            className="h-16 w-16 lg:hidden"
          />
          <div>
            <p className="eyebrow">Espace boutique</p>
            <h2 className="mt-1 text-3xl font-bold">Connexion</h2>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Adresse e-mail</span>
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${adminInput} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mot de passe</span>
            <span className="relative mt-1.5 block">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${adminInput} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-5 w-5 accent-[var(--ink)]"
            />
            Rester connectée sur cet appareil
          </label>
          {error && <Alert tone="error">{error}</Alert>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground shadow-gold disabled:opacity-70"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Connexion…" : "Se connecter"}
          </button>
          <p className="text-xs text-muted-foreground">
            Mot de passe oublié ? Demandez une réinitialisation à votre administrateur.
          </p>
        </form>
      </section>
    </main>
  );
}
