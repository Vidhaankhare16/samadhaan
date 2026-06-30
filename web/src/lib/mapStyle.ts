// Hand-tuned "civic paper" Google Maps style.
// Warm ivory land, muted ink labels, soft terracotta roads — matches the
// editorial/govtech surface so the map reads as part of the design, not an embed.

export const CIVIC_PAPER_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#efe7d7" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5c5247" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#faf5eb" }, { weight: 2 }] },

  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c7b9a1" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#8a7c66" }] },

  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d6dcc0" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6f7a4f" }] },

  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f6f0e4" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e3d8c2" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f9f4ea" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ecd9c0" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d8c09c" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9a8c74" }] },

  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e0d4bd" }] },

  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d4d0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7d918c" }] },
];

export const MAP_OPTIONS: Partial<google.maps.MapOptions> = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  backgroundColor: "#efe7d7",
  gestureHandling: "greedy",
  styles: CIVIC_PAPER_STYLE,
};
