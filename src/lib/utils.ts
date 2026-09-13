import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatFileSizeMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}
