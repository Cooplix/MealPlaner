interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      className={`whitespace-nowrap flex-shrink-0 rounded-lg border text-sm px-3 py-1.5 sm:px-4 ${
        active ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-100"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
