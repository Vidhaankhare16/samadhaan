"use client";

let promise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject("no window");
  if (promise) return promise;

  const key = process.env.NEXT_PUBLIC_MAPS_API_KEY;
  promise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google);
    const cbName = "__samMapsCb";
    (window as unknown as Record<string, unknown>)[cbName] = () => resolve(window.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&callback=${cbName}&loading=async`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return promise;
}
