import { useState } from "react";

export default function Contacts() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`svg-readme contact from ${name || "someone"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:hello@example.com?subject=${subject}&body=${body}`;
    setToast("Opening your mail app…");
  };

  const inputCls =
    "w-full p-3 border border-zinc-200 bg-white text-sm text-zinc-900 outline-none transition-all focus:border-[#1b5def] focus:shadow-[0_0_0_3px_rgba(27,93,239,0.1)]";

  return (
    <div className="bg-[#fafafa] text-zinc-900 antialiased">
      <section className="max-w-2xl mx-auto py-16 px-6">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-[#1b5def] mb-5">
          <span aria-hidden="true" className="w-[6px] h-[6px] bg-[#1b5def]" />
          Contact
        </div>
        <h2 className="font-display text-4xl font-bold mb-4 tracking-tight">
          Contact Us
        </h2>
        <p className="text-zinc-500 leading-[1.7] mb-8">
          Found a bug, want a template, or just saying hi? Send a note — it
          opens your mail app, nothing is stored on a server.
        </p>
        <form className="space-y-4 border border-zinc-200 bg-white p-7" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="contact-name" className="sr-only">
              Your Name
            </label>
            <input
              id="contact-name"
              type="text"
              placeholder="Your Name"
              autoComplete="name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="sr-only">
              Your Email
            </label>
            <input
              id="contact-email"
              type="email"
              placeholder="Your Email"
              autoComplete="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="sr-only">
              Your Message
            </label>
            <textarea
              id="contact-message"
              placeholder="Your Message"
              rows={5}
              className={inputCls}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#1b5def] text-white text-sm font-semibold hover:bg-[#164ecb] transition-colors"
          >
            Send Message
          </button>
          <span aria-live="polite" className="font-mono text-xs text-zinc-500 block">
            {toast}
          </span>
        </form>
      </section>
    </div>
  );
}
