import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-6">SummitSteps</h1>
        <p className="text-xl mb-6">
          SummitSteps is a mobile app that turns everyday stair climbing and elevation gain
          into progress toward real-world mountain summits.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">What it does</h2>
        <p className="mb-4">
          Users track daily elevation gain through activity data and choose a mountain to climb.
          As they gain elevation over time, they make progress toward summiting that mountain.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Email usage</h2>
        <p className="mb-4">
          SummitSteps uses email only for transactional purposes such as account verification,
          password reset, and essential account-related notifications.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Contact</h2>
        <p>support@summitsteps.com</p>

        <p className="mt-10 space-x-4">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
        </p>

      </div>
    </main>
  );
}