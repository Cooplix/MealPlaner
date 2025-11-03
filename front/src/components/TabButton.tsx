interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      className={`px-3 py-1.5 rounded-lg border text-sm ${
        active ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-100"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
