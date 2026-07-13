
interface RightBarProps {
  className?: string;
} 

export default function RightBar({ className }: RightBarProps) {
  return (
    <aside className={className || "p-4"}>
      <h2 className="font-bold mb-2">Tools</h2>
      <ul className="space-y-2">
        <li>Preview</li>
        <li>Settings</li>
        <li>Assets</li>
      </ul>
    </aside>
  );
}