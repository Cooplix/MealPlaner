import type { MealSlot } from "../types";

export const MEAL_LABEL_KEYS: Record<MealSlot, string> = {
  breakfast: "meals.breakfast",
  lunch: "meals.lunch",
  dinner: "meals.dinner",
  snack: "meals.snack",
};

export const MEAL_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
