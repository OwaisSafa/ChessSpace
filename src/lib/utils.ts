import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function playSound(soundFile: string) {
  try {
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(error => console.error(`Error playing sound: ${soundFile}`, error));
  } catch (error) {
    console.error(`Could not play sound: ${soundFile}`, error);
  }
}
