import { isValidEmail, isObjectId } from "../lib/validate";

/**
 * 
 * @param value any of id, slug or email
 * @returns object of the matching field
 */
export const slugIdFilters = (value: string) => isValidEmail(value) ? { email: value } : isObjectId(value) ? { _id: value } : { slug: value }


export function slugify(text: string, appendTimestamp: boolean = false): string {
    // Create slug
    const base = text
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")   // remove accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")       // replace non-alphanumeric with dashes
        .replace(/^-+|-+$/g, "");          // trim leading/trailing dashes

    // Timestamp: YYYY-MM-DD-HHMMSS
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const timestamp = `${`${yyyy}`.substring(-2)}-${mm}-${dd}-${hh}${min}${ss}`;

    return appendTimestamp ? `${base.substring(0, 200)}-${timestamp}` : base.substring(0, 200);
}

