import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export interface DecodedToken {
  exp?: number;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
