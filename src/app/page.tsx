import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-pink-600/5 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">🧩</span>
          <span className="text-xl font-bold text-gradient">Piece Together</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/how-to-play"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            How to Play
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl text-center space-y-8">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            Solve Puzzles
            <br />
            <span className="text-gradient">Together</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
            Create a room, invite friends, and collaboratively assemble
            beautiful jigsaw puzzles in real-time. See everyone&apos;s cursor, chat
            while you play, and race the clock.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/create"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-glow shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
            >
              <span className="text-lg">🎨</span>
              Create a Room
            </Link>
            <Link
              href="/join"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white glass-card hover:border-indigo-400/40 transition-all duration-300"
            >
              <span className="text-lg">🔗</span>
              Join a Room
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl font-bold mb-12 text-slate-300">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                emoji: "🖼️",
                title: "Pick an Image",
                desc: "Choose from curated presets or upload your own image to slice into pieces.",
              },
              {
                emoji: "📤",
                title: "Share the Code",
                desc: "Get a memorable room code and share it with friends to join your puzzle session.",
              },
              {
                emoji: "🧩",
                title: "Piece It Together",
                desc: "Drag, snap, and collaborate in real-time. See everyone's cursors and chat as you go.",
              },
            ].map((step, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 text-center space-y-3">
                <div className="text-4xl">{step.emoji}</div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-sm text-slate-500">
        Built with 🧩 and ❤️ — Piece Together &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
