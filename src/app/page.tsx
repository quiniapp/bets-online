import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#1e3a8a] to-[#1e1b4b] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Betting <span className="text-[hsl(220,100%,70%)]">Arena</span>
        </h1>
        <p className="text-xl text-center max-w-2xl">
          Welcome to the dual authentication betting platform. Choose your access level below.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20 transition-colors"
            href="/admin-login"
          >
            <h3 className="text-2xl font-bold">Admin Access →</h3>
            <div className="text-lg">
              Administrative portal for managing users, games, and platform operations.
            </div>
          </Link>
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20 transition-colors"
            href="/user-login"
          >
            <h3 className="text-2xl font-bold">User Access →</h3>
            <div className="text-lg">
              User portal for betting, account management, and game access.
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
