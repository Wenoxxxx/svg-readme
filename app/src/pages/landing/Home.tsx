
export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
      <h1 className="text-5xl font-bold mb-4">Welcome to SVG-README</h1>
      <p className="text-lg mb-6">Build and customize your README with style.</p>
      <a
        href="/about"
        className="px-6 py-3 bg-white text-blue-600 shadow hover:bg-gray-100 transition"
      >
        Learn More
      </a>
    </section>
);
}