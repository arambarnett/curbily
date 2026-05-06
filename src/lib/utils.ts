import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseJSON(text: string) {
  if (!text) return null;
  
  // Clean markdown syntax if present (including incomplete ones)
  let cleaned = text.replace(/```(json)?\s?/g, "").trim();

  // Extract JSON string from conversational text
  let firstIndex = Math.max(cleaned.indexOf('{'), cleaned.indexOf('['));
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  if (firstBrace !== -1 && firstBracket !== -1) firstIndex = Math.min(firstBrace, firstBracket);
  else if (firstBrace !== -1) firstIndex = firstBrace;
  else if (firstBracket !== -1) firstIndex = firstBracket;

  let lastIndex = -1;
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  if (lastBrace !== -1 && lastBracket !== -1) lastIndex = Math.max(lastBrace, lastBracket);
  else if (lastBrace !== -1) lastIndex = lastBrace;
  else if (lastBracket !== -1) lastIndex = lastBracket;

  if (firstIndex !== -1 && lastIndex !== -1 && lastIndex >= firstIndex) {
    cleaned = cleaned.substring(firstIndex, lastIndex + 1);
  }
  
  // Remove trailing commas inside arrays and objects which are common LLM errors
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  try {
    // Try direct parse
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Direct parse fail, attempting repair...");
    // Attempt to repair truncated JSON
    let repaired = cleaned;
    
    // If it ends with a dangling key, strip it out
    if (repaired.match(/[:,-]\s*$/)) {
      repaired = repaired.replace(/,\s*["'][^"']+["']\s*[:]\s*$/, "");
      if (repaired.endsWith(":")) {
        repaired = repaired.substring(0, Math.max(0, repaired.lastIndexOf(',')));
      } else if (repaired.endsWith(",")) {
        repaired = repaired.substring(0, repaired.length - 1);
      }
    }

    // Stack-based bracket closer
    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
          if (char === '{') stack.push('}');
          else if (char === '[') stack.push(']');
          else if (char === '}' || char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === char) {
              stack.pop();
            } else {
              // Mismatched or extra closing bracket. Truncate the string at this point
              repaired = repaired.substring(0, i);
              break;
            }
          }
        }
    }
    
    // If we're still in a string, close it
    if (inString) {
      repaired += '"';
    }

    while (stack.length > 0) {
      // @ts-ignore
      repaired += stack.pop();
    }

    try {
      return JSON.parse(repaired);
    } catch (e2) {
      console.error("JSON Parse Error (Final Repair):", e2, "Text:", repaired);
      return null;
    }
  }
}


export function ensureAbsoluteUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  // Check if it's already a safe protocol like mailto or tel
  if (trimmedUrl.startsWith('mailto:') || trimmedUrl.startsWith('tel:')) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

/**
 * Compresses an image to fit within Firestore document limits (~1MB total per doc).
 * Targets around 200KB-400KB for safety while maintaining good quality.
 */
export async function compressImage(base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if larger than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Use webp if supported for better compression, fallback to jpeg
      const processed = canvas.toDataURL('image/jpeg', quality);
      resolve(processed);
    };
    img.onerror = (err) => reject(err);
  });
}
