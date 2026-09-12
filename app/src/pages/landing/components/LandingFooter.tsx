import { Link } from "react-router-dom";

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      <div className="max-w-[1200px] mx-auto px-6 pt-14 pb-8">
        <div className="flex justify-between items-start flex-wrap gap-6 pb-10 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img
              className="w-7 h-7 flex items-center justify-center"
              src={`${import.meta.env.BASE_URL}svg-readme-logo.png`}
              alt="svg-readme logo"
            />
            <span className="font-display font-semibold text-[17px] text-white">
              svg-readme
            </span>
          </Link>
          <a
            className="font-mono text-[13px] border border-white/20 px-3.5 py-2 text-zinc-200 hover:bg-white hover:text-zinc-950 hover:border-white transition-all whitespace-nowrap no-underline"
            href="https://github.com/Wenoxxxx/svg-readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 py-10">
          <div>
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-4">
              svg-readme
            </div>
            <p className="text-sm leading-[1.7] max-w-[280px]">
              Animated SVG banners for your GitHub profile README — designed in
              the browser, exported with keyframes baked in.
            </p>
          </div>

          <nav aria-label="Footer explore">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-4">
              Explore
            </div>
            <ul className="flex flex-col gap-2.5 text-sm list-none m-0 p-0">
              <li>
                <a href="/#studio" className="hover:text-white transition-colors no-underline text-inherit">
                  Generator
                </a>
              </li>
              <li>
                <a href="/#how" className="hover:text-white transition-colors no-underline text-inherit">
                  How it works
                </a>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors no-underline text-inherit">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="hover:text-white transition-colors no-underline text-inherit">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/editor" className="text-[#5b8cff] font-semibold hover:text-white transition-colors no-underline">
                  Full Editor →
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Footer creators">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-4">
              Creators
            </div>
            <ul className="flex flex-col gap-2.5 text-sm list-none m-0 p-0">
              <li>
                <a
                  href="https://github.com/Wenoxxxx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors no-underline text-inherit"
                >
                  Wenoxxxx ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Drakaniia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors no-underline text-inherit"
                >
                  Drakaniia ↗
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-6 flex justify-between items-center flex-wrap gap-3">
          <span className="font-mono text-xs text-zinc-500">
            made by{" "}
            <a
              href="https://github.com/Wenoxxxx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-100 hover:text-white transition-colors no-underline"
            >
              Wenoxxxx
            </a>{" "}
            &{" "}
            <a
              href="https://github.com/Drakaniia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-100 hover:text-white transition-colors no-underline"
            >
              Drakaniia
            </a>
          </span>
          <span className="font-mono text-xs text-zinc-600">MIT · {year}</span>
        </div>
      </div>
    </footer>
  );
}
