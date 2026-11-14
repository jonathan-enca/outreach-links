import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Assemble des classes Tailwind sans conflit (convention shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
