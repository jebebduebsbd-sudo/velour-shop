import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Velore</h1>
        <p className="text-slate-400">
          Next.js 16 + Prisma 7 (SQLite via better-sqlite3). The list below is
          fetched from the database on every request.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Users</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
            {users.length} total
          </span>
        </div>

        {users.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-6 text-slate-400">
            No users yet. Run <code className="text-slate-200">npx prisma db seed</code> to
            populate the database.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-slate-400">{user.email}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {user.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
