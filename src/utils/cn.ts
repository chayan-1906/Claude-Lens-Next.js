import {twMerge} from "tailwind-merge";
import {type ClassValue, clsx} from "clsx";

/**
 * Merge Tailwind CSS classes intelligently
 * Combines clsx (conditional classes) with tailwind-merge (resolves conflicts)
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export {cn};
