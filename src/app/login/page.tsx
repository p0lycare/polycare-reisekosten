import { mitMicrosoftAnmelden } from "./actions";
import { Logo } from "../logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { fehler } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6 font-sans">
      <div>
        <Logo className="mb-4 h-10 w-auto text-marke" />
        <h1 className="text-2xl font-semibold">Polycare Reisekosten</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Melde dich mit deinem Polycare-Microsoft-Konto an.
        </p>
      </div>

      {fehler && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.
        </p>
      )}

      <form action={mitMicrosoftAnmelden}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Mit Microsoft anmelden
        </button>
      </form>
    </main>
  );
}
