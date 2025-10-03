export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      {/* Spinning whisk (circular loader) */}
      <div className="mb-8 w-16 h-16 border-4 border-t-transparent border-blue-400 rounded-full animate-spin"></div>

      {/* Title */}
      <h1 className="text-5xl font-extrabold tracking-tight mb-4">
        It’s Mixing....
      </h1>

      <p className="text-lg text-gray-400">neuronomixer.com</p>
    </main>
  );
}
