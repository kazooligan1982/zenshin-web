import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function linkifyUrls(text: string): string {
  const escapedText = escapeHtml(text)
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const linkedText = escapedText.replace(urlRegex, (url) => {
    const decodedUrl = url
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
    return `<a href="${decodedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline break-all">${url}</a>`
  })
  return linkedText.replace(/\n/g, "<br />")
}
