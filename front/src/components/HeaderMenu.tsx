import { useEffect, useRef, useState } from "react";

interface HeaderMenuProps {
  menuLabel: string;
  profileLabel: string;
  inventoryLabel: string;
  ingredientsLabel: string;
  caloriesLabel: string;
  logoutLabel: string;
  onSelectProfile: () => void;
  onSelectInventory: () => void;
  onSelectIngredients: () => void;
  onSelectCalories: () => void;
  onLogout: () => void;
}

export function HeaderMenu({
  menuLabel,
  profileLabel,
  inventoryLabel,
  ingredientsLabel,
  caloriesLabel,
  logoutLabel,
  onSelectProfile,
  onSelectInventory,
  onSelectIngredients,
  onSelectCalories,
  onLogout,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function toggle() {
    setOpen((prev) => !prev);
  }

  function selectIngredients() {
    onSelectIngredients();
    setOpen(false);
  }

  function selectCalories() {
    onSelectCalories();
    setOpen(false);
  }

  function selectProfile() {
    onSelectProfile();
    setOpen(false);
  }

  function selectInventory() {
    onSelectInventory();
    setOpen(false);
  }

  function logout() {
    onLogout();
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        {menuLabel}
        <span className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={selectProfile}
          >
            {profileLabel}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={selectInventory}
          >
            {inventoryLabel}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={selectIngredients}
          >
            {ingredientsLabel}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={selectCalories}
          >
            {caloriesLabel}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={logout}
          >
            {logoutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
