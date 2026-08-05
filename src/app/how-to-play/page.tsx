import Link from "next/link";

export default function HowToPlayPage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">🧩</span>
          <span className="text-xl font-bold text-gradient">Piece Together</span>
        </Link>
      </nav>

      <section className="flex-1 px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold">
              How to <span className="text-gradient">Play</span>
            </h1>
            <p className="text-slate-400">
              Everything you need to know to start piecing puzzles together with friends
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {[
              {
                step: "01",
                emoji: "🎨",
                title: "Create a Room",
                desc: 'Click "Create a Room" from the home page. Choose a puzzle image from our curated gallery or paste a custom image URL. Select your difficulty (9 to 144 pieces) and set the max number of players.',
              },
              {
                step: "02",
                emoji: "📤",
                title: "Share Your Room Code",
                desc: "Once your room is created, you'll see a unique room code like HAPPY-PUZZLE-742. Share this code with friends — they can join by entering it on the Join page.",
              },
              {
                step: "03",
                emoji: "👥",
                title: "Wait in the Lobby",
                desc: "Your lobby shows all connected players in real-time. Chat with your team while you wait. When everyone is ready, the host clicks Start Game.",
              },
              {
                step: "04",
                emoji: "🖱️",
                title: "Drag & Snap Pieces",
                desc: "Click and drag puzzle pieces to move them. When a piece is close enough to its correct position on the board, it snaps into place with a satisfying lock. Nearby pieces also snap together to form groups you can drag as one.",
              },
              {
                step: "05",
                emoji: "👀",
                title: "Collaborate in Real-Time",
                desc: "See every player's cursor on the board in real-time with color-coded pointers. When someone grabs a piece, it's locked so two people can't fight over the same one.",
              },
              {
                step: "06",
                emoji: "🎉",
                title: "Complete the Puzzle!",
                desc: "Once all pieces are placed, the timer stops and you'll see your total solve time. Celebrate with your team and start a new puzzle!",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card rounded-2xl p-6 flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-xl">
                  {item.emoji}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      Step {item.step}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center pt-6">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-glow shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
            >
              🚀 Create Your First Room
            </Link>
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
