interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={className || "p-4"}>
      <ul className="space-y-2">
        <li>
          <a href="/editor/edit" className="hover:text-blue-400">
            Edit
          </a>
        </li>
        <li>
          <a href="/editor/templates" className="hover:text-blue-400">
            Templates
          </a>
        </li>
      </ul>
    </aside>
  );
}
