import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ══════════════════════════════════════════════════════════════════════════
// GOOGLE ANALYTICS 4 — event tracking helper
// ══════════════════════════════════════════════════════════════════════════
// Thin wrapper around gtag so tracking calls never throw if analytics hasn't
// loaded yet (ad blockers, slow network, etc). The base tag itself lives in
// index.html so it loads on every page before React even mounts.
function trackEvent(eventName, params) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params || {});
  }
}

// ══════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR SETUP — private calendars, no API key needed
// ══════════════════════════════════════════════════════════════════════════
// The availability calendar reads live booking dates from each camper's
// PRIVATE Google Calendar, via its "Secret address in iCal format" and a
// small Netlify serverless function (see netlify/functions/availability.js).
// The calendars never need to be made public. To add or remove a booking,
// just add/delete an event on the relevant calendar — no code changes or
// redeploys needed.
//
// SETUP STEPS (one-time):
// 1. For EACH calendar: Google Calendar → Settings and sharing → scroll to
//    "Integrate calendar" → copy the "Secret address in iCal format."
// 2. In the Netlify dashboard: Site settings → Environment variables → add
//    CEDAR_CREEK_ICS_URL and ASPEN_TRAIL_ICS_URL, pasting each camper's
//    secret URL as the value. (Kept out of the source code / GitHub repo on
//    purpose, since these URLs work like a password — anyone with the exact
//    link can read that calendar's events.)
// 3. Redeploy once after adding the environment variables so the function
//    picks them up.
// 4. To log a booking going forward: create an event on the correct
//    camper's calendar spanning check-in through check-out. An all-day
//    event works best — Google automatically treats the end date as the
//    checkout/turnaround day, exactly matching how the website displays it.
//
// That's it — nothing to paste here in the website code itself. If a secret
// URL ever needs to change (e.g. after a "Reset" in Google Calendar), just
// update the matching environment variable in Netlify — no code edit needed.

// ── Scroll-reveal hook (IntersectionObserver, respects prefers-reduced-motion) ─
function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: options.threshold ?? 0.12, rootMargin: options.rootMargin ?? "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ── Image assets (your real photos) ──────────────────────────────────────────
const IMAGES = {
  // Homepage
  hero: "/images/homepage/hero.jpg",
  logo: "/images/homepage/logo.jpg",
  kitchen: "/images/homepage/kitchen.jpg",
  welcome: "/images/homepage/welcome.jpg",
  bedroom: "/images/homepage/bedroom.jpg",
  cta_campfire: "/images/homepage/cta-campfire.jpg",
  delivery: "/images/homepage/delivery.jpg",
  aspen_trail: "/images/homepage/aspen-trail.jpg",

  // Meet Us page
  meet_owners: "/images/meet-us/meet-owners.jpg",
  meet_kids: "/images/meet-us/meet-kids.jpg",
  meet_rudy: "/images/meet-us/meet-rudy.jpg",
  owners: "/images/meet-us/meet-owners.jpg",

  // Cedar Creek / 5th Wheel
  cedar_creek: "/images/cedar-creek/5th-wheel-front-lake.jpg",
  cc_floorplan: "/images/cedar-creek/5th-wheel-floor-plan.png",
  cc_ext_day: "/images/cedar-creek/5th-wheel-front-lake.jpg",
  cc_ext_day2: "/images/cedar-creek/5th-wheel-side-lake.jpg",
  cc_ext_day3: "/images/cedar-creek/5th-wheel-rear-lake.jpg",
  cc_ext_night: "/images/cedar-creek/5th-wheel-exterior-night.jpg",
  cc_site1: "/images/cedar-creek/5th-wheel-exterior.jpg",
  cc_site2: "/images/cedar-creek/5th-wheel-night-2.jpg",
  cc_truck: "/images/cedar-creek/5th-wheel-truck.jpg",
  cc_living: "/images/cedar-creek/5th-wheel-living-room-lake-view.jpg",
  cc_fireplace: "/images/cedar-creek/5th-wheel-fireplace-tv.jpg",
  cc_kitchen: "/images/cedar-creek/5th-wheel-island.jpg",
  cc_kitchen2: "/images/cedar-creek/5th-wheel-island.jpg",
  cc_bedroom: "/images/cedar-creek/5th-wheel-master-king-bedroom.jpg",
  cc_bed2: "/images/cedar-creek/5th-wheel-master-and-closet.jpg",
  cc_beds: "/images/cedar-creek/5th-wheel-beds.jpg",
  cc_welcome: "/images/cedar-creek/5th-wheel-bar-and-welcome.jpg",
  cc_bathroom: "/images/cedar-creek/5th-wheel-full-size-shower.jpg",
  cc_bath2: "/images/cedar-creek/5th-wheel-sink.jpg",
  cc_bath3: "/images/cedar-creek/5th-wheel-full-size-shower.jpg",
  cc_lake_view: "/images/cedar-creek/5th-wheel-side-lake.jpg",
  cc_recliners: "/images/cedar-creek/5th-wheel-recliners-lake-view.jpg",
  cc_living_area: "/images/cedar-creek/5th-wheel-living-area.jpg",
  cc_night3: "/images/cedar-creek/5th-wheel-night-3.jpg",

  // Aspen Trail
  at_ext1: "/images/aspen-trail/at-exterior.jpg",
  at_ext2: "/images/aspen-trail/at-exterior-back.jpg",
  at_living: "/images/aspen-trail/at-living.jpg",
  at_kitchen: "/images/aspen-trail/at-kitchen.jpg",
  at_bunkbed: "/images/aspen-trail/at-master.jpg",
  at_master: "/images/aspen-trail/at-master.jpg",
  at_exitdoor: "/images/aspen-trail/at-exitdoor.jpg",
  at_bathsink: "/images/aspen-trail/at-bathsink.jpg",
  at_bathshower: "/images/aspen-trail/at-bathshower.jpg",
  at_bathvanity: "/images/aspen-trail/at-bathvanity.jpg",
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  forest:  "#2D4A2D",   // deep green
  sage:    "#4A7C59",   // mid green
  ember:   "#E8651A",   // warm orange (logo orange — kept for accents only)
  bronze:  "#8B5E3C",   // warm bronze — primary button color
  bronzeHover: "#6E4A2D", // deeper bronze for hover
  sunset:  "#D94F6E",   // hot pink (logo pink)
  gold:    "#F4A01C",   // golden yellow (logo yellow)
  cream:   "#FDFAF5",   // warm off-white
  sand:    "#F5EFE6",   // light warm tan
  charcoal:"#1C1C1C",   // near-black text
  mist:    "#6B7B6B",   // muted green-grey text
};

// ── Styles object ─────────────────────────────────────────────────────────────
const S = {
  // Nav
  nav: (scrolled) => ({
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 clamp(20px, 4vw, 60px)",
    height: "72px",
    background: scrolled
      ? "rgba(29, 42, 29, 0.97)"
      : "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
    backdropFilter: scrolled ? "blur(12px)" : "none",
    transition: "background 0.4s ease, backdrop-filter 0.4s ease",
    borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
  }),
  navBrand: {
    display: "flex", alignItems: "center", gap: "12px",
    textDecoration: "none", cursor: "pointer",
  },
  navLogo: {
    height: "38px", width: "auto", display: "block",
    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
    flexShrink: 0,
  },
  navBrandText: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700,
    fontSize: "clamp(15px, 1.6vw, 20px)",
    color: "#fff",
    letterSpacing: "0.01em",
    lineHeight: 1.2,
    textShadow: "0 1px 8px rgba(0,0,0,0.4)",
    whiteSpace: "nowrap",
  },
  navLinks: {
    display: "flex", gap: "36px", listStyle: "none", margin: 0, padding: 0,
  },
  navLink: {
    color: "#fff", textDecoration: "none",
    fontFamily: "'Inter', sans-serif", fontWeight: 500,
    fontSize: "15px", letterSpacing: "0.02em",
    opacity: 0.9, cursor: "pointer",
    transition: "opacity 0.2s",
  },
  navCta: {
    background: C.forest, color: "#fff",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50px",
    padding: "10px 24px",
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px",
    cursor: "pointer", letterSpacing: "0.04em",
    transition: "background 0.25s, transform 0.2s, box-shadow 0.25s",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
  },

  // Hero
  hero: {
    position: "relative", width: "100%", height: "100vh",
    minHeight: "600px", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  heroBg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center 30%",
    backgroundRepeat: "no-repeat",
  },
  heroOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(10,20,10,0.65) 60%, rgba(0,0,0,0.75) 100%)",
  },
  heroContent: {
    position: "relative", zIndex: 2,
    textAlign: "center",
    padding: "0 clamp(20px, 5vw, 80px)",
    maxWidth: "820px",
  },
  heroEyebrow: {
    display: "inline-block",
    color: C.gold,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600, fontSize: "13px",
    letterSpacing: "0.18em", textTransform: "uppercase",
    marginBottom: "20px",
    background: "rgba(244,160,28,0.15)",
    padding: "6px 18px", borderRadius: "50px",
    border: "1px solid rgba(244,160,28,0.35)",
  },
  heroH1: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700, color: "#fff",
    fontSize: "clamp(42px, 7vw, 82px)",
    lineHeight: 1.08, margin: "0 0 22px",
    textShadow: "0 2px 24px rgba(0,0,0,0.4)",
    letterSpacing: "-0.01em",
  },
  heroSub: {
    fontFamily: "'Inter', sans-serif",
    color: "rgba(255,255,255,0.88)",
    fontSize: "clamp(16px, 2.2vw, 20px)",
    lineHeight: 1.65, maxWidth: "600px",
    margin: "0 auto 40px",
    fontWeight: 400,
  },
  heroBtns: {
    display: "flex", gap: "14px",
    justifyContent: "center", flexWrap: "wrap",
  },
  btnPrimary: {
    background: C.bronze, color: "#fff",
    border: "none", borderRadius: "50px",
    padding: "16px 36px",
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px",
    cursor: "pointer", letterSpacing: "0.04em",
    boxShadow: "0 4px 20px rgba(139,94,60,0.35)",
    transition: "transform 0.2s, box-shadow 0.2s, background 0.25s",
  },
  btnOutline: {
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(8px)",
    color: "#fff", border: "2px solid rgba(255,255,255,0.5)",
    borderRadius: "50px", padding: "14px 34px",
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px",
    cursor: "pointer", letterSpacing: "0.02em",
    transition: "background 0.2s, border-color 0.2s",
  },

  // How it works — premium refinement
  hiw: {
    background: "linear-gradient(160deg, #FDFAF5 0%, #F8F2E8 50%, #FDFAF5 100%)",
    padding: "0 clamp(24px, 6vw, 80px) 0",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  hiwInner: {
    paddingTop: "100px",
    paddingBottom: "100px",
    position: "relative",
    zIndex: 1,
  },
  hiwEyebrow: {
    display: "inline-flex", alignItems: "center", gap: "12px",
    color: C.sage, fontFamily: "'Inter', sans-serif",
    fontWeight: 700, fontSize: "11px",
    letterSpacing: "0.3em", textTransform: "uppercase",
    marginBottom: "22px",
  },
  hiwH2: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700, color: C.charcoal,
    fontSize: "clamp(38px, 5vw, 62px)",
    lineHeight: 1.06, margin: "0 0 24px",
    letterSpacing: "-0.02em",
  },
  hiwSubtitle: {
    fontFamily: "'Inter', sans-serif",
    color: C.mist, fontSize: "18px", lineHeight: 1.68,
    maxWidth: "540px", margin: "0 auto 80px",
    fontWeight: 400,
  },
  hiwGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    maxWidth: "1260px",
    margin: "0 auto",
    alignItems: "stretch",
  },
  hiwCard: {
    background: "#fff",
    borderRadius: "24px",
    padding: "52px 28px 48px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
    textAlign: "center",
    border: "1px solid rgba(45,74,45,0.08)",
    transition: "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  hiwIconWrap: {
    width: "100px", height: "100px",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 32px",
    position: "relative",
    flexShrink: 0,
  },
  hiwStepNum: {
    position: "absolute", top: "-3px", right: "-3px",
    width: "28px", height: "28px",
    borderRadius: "50%",
    background: C.forest,
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700, fontSize: "11px",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 10px rgba(45,74,45,0.4)",
    flexShrink: 0,
  },
  hiwStep: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600, fontSize: "10px",
    letterSpacing: "0.28em", textTransform: "uppercase",
    color: C.gold, marginBottom: "12px",
    flexShrink: 0,
  },
  hiwTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700, color: C.charcoal,
    fontSize: "20px", marginBottom: "16px",
    lineHeight: 1.25,
    flexShrink: 0,
  },
  hiwDesc: {
    fontFamily: "'Inter', sans-serif",
    color: C.mist, fontSize: "14px", lineHeight: 1.78,
    flex: 1,
  },
  hiwConnector: {
    display: "none",
  },

  // Shared section typography (used by Fleet, Why, Owners, CTA)
  sectionEyebrow: {
    display: "inline-block",
    color: C.sage, fontFamily: "'Inter', sans-serif",
    fontWeight: 700, fontSize: "12px",
    letterSpacing: "0.2em", textTransform: "uppercase",
    marginBottom: "14px",
  },
  sectionH2: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700, color: C.charcoal,
    fontSize: "clamp(30px, 4vw, 48px)",
    lineHeight: 1.15, margin: "0 0 16px",
  },
  sectionSubtitle: {
    fontFamily: "'Inter', sans-serif",
    color: C.mist, fontSize: "17px", lineHeight: 1.6,
    maxWidth: "520px", margin: "0 auto 60px",
  },

  // Fleet
  fleet: {
    background: C.sand, padding: "100px clamp(20px, 6vw, 80px)",
  },
  fleetHeader: { textAlign: "center", marginBottom: "56px" },
  fleetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "32px", maxWidth: "1100px", margin: "0 auto",
  },
  fleetCard: {
    background: "#fff", borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
    transition: "transform 0.3s, box-shadow 0.3s",
  },
  fleetImg: {
    width: "100%", height: "280px",
    objectFit: "cover", display: "block",
  },
  fleetBody: { padding: "28px" },
  fleetBadge: {
    display: "inline-block",
    background: "rgba(74,124,89,0.12)",
    color: C.sage, fontFamily: "'Inter', sans-serif",
    fontWeight: 700, fontSize: "11px",
    letterSpacing: "0.15em", textTransform: "uppercase",
    padding: "5px 14px", borderRadius: "50px",
    marginBottom: "14px",
  },
  fleetName: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700, color: C.charcoal,
    fontSize: "24px", marginBottom: "6px",
  },
  fleetMeta: {
    fontFamily: "'Inter', sans-serif",
    color: C.mist, fontSize: "14px",
    marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px",
  },
  fleetDesc: {
    fontFamily: "'Inter', sans-serif",
    color: "#555", fontSize: "15px", lineHeight: 1.6,
    marginBottom: "24px",
  },
  fleetAmenities: {
    display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px",
  },
  fleetAmenity: {
    background: C.sand, color: C.forest,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500, fontSize: "12px",
    padding: "5px 12px", borderRadius: "50px",
    border: "1px solid rgba(45,74,45,0.12)",
  },
  btnForest: {
    display: "inline-block",
    background: C.forest, color: "#fff",
    border: "none", borderRadius: "50px",
    padding: "13px 30px",
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px",
    cursor: "pointer", letterSpacing: "0.02em",
    transition: "background 0.2s, transform 0.15s",
  },

  // Why Choose Us — premium card redesign (light cream, not dark strip)
  why: {
    background: C.cream,
    padding: "100px clamp(24px, 6vw, 80px) 110px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  whyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "24px",
    maxWidth: "880px",
    margin: "0 auto",
    alignItems: "stretch",
  },
  whyItem: {
    background: "#fff",
    borderRadius: "24px",
    padding: "44px 28px 40px",
    textAlign: "center",
    border: "1px solid rgba(45,74,45,0.08)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
    display: "flex", flexDirection: "column", alignItems: "center",
    transition: "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.32s cubic-bezier(0.25,0.46,0.45,0.94)",
    position: "relative", overflow: "hidden",
  },
  whyIconWrap: {
    width: "140px", height: "140px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 24px", flexShrink: 0,
    transition: "box-shadow 0.35s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
    overflow: "hidden",
  },
  whyTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    color: C.charcoal, fontSize: "19px", fontWeight: 700,
    marginBottom: "12px", lineHeight: 1.25,
  },
  whyDesc: {
    fontFamily: "'Inter', sans-serif",
    color: C.mist, fontSize: "14px", lineHeight: 1.75,
    flex: 1,
  },
  whyIcon: { fontSize: "36px", marginBottom: "12px" },

  // Owners strip
  owners: {
    background: C.cream, padding: "80px clamp(20px, 6vw, 80px)",
  },
  ownersInner: {
    maxWidth: "900px", margin: "0 auto",
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: "56px", alignItems: "center",
  },
  ownersImg: {
    width: "100%", borderRadius: "20px",
    objectFit: "cover", height: "380px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
  },
  ownersText: {},
  ownersQuote: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "clamp(22px, 3vw, 32px)",
    color: C.charcoal, lineHeight: 1.35,
    marginBottom: "20px",
    fontStyle: "italic",
  },
  ownersMeta: {
    fontFamily: "'Inter', sans-serif",
    color: C.mist, fontSize: "15px", lineHeight: 1.7,
    marginBottom: "28px",
  },
  ownersName: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700, color: C.sage, fontSize: "14px",
    letterSpacing: "0.05em", textTransform: "uppercase",
  },

  // CTA
  cta: {
    position: "relative", padding: "120px clamp(20px, 6vw, 80px)",
    textAlign: "center", overflow: "hidden",
  },
  ctaBg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
  },
  ctaOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(135deg, rgba(45,74,45,0.88) 0%, rgba(10,10,10,0.80) 100%)",
  },
  ctaContent: { position: "relative", zIndex: 2 },
  ctaH2: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700, color: "#fff",
    fontSize: "clamp(32px, 5vw, 56px)",
    marginBottom: "16px", lineHeight: 1.1,
  },
  ctaSub: {
    fontFamily: "'Inter', sans-serif",
    color: "rgba(255,255,255,0.82)", fontSize: "18px",
    marginBottom: "40px", lineHeight: 1.6,
  },

  // Footer
  footer: {
    background: C.charcoal, padding: "48px clamp(20px, 6vw, 80px) 32px",
    textAlign: "center",
  },
  footerLogo: {
    height: "48px", marginBottom: "20px",
    filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
  },
  footerText: {
    fontFamily: "'Inter', sans-serif",
    color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.7,
  },
  footerLinks: {
    display: "flex", gap: "28px", justifyContent: "center",
    flexWrap: "wrap", listStyle: "none", margin: "20px 0 24px", padding: 0,
  },
  footerLink: {
    fontFamily: "'Inter', sans-serif",
    color: "rgba(255,255,255,0.6)", fontSize: "14px",
    textDecoration: "none", cursor: "pointer",
    transition: "color 0.2s",
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────
// ── Premium inline SVG icons for HIW ─────────────────────────────────────────
const HIW_ICONS = {
  // STEP 1 — Camper with pine trees and mountains, full color illustration
  trailer: () => (
    <svg width="76" height="76" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hiw-sky-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFE3F5"/>
          <stop offset="100%" stopColor="#E8F4ED"/>
        </linearGradient>
        <linearGradient id="hiw-trailer-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#EDEAE2"/>
        </linearGradient>
        <linearGradient id="hiw-tree-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A7C59"/>
          <stop offset="100%" stopColor="#2D4A2D"/>
        </linearGradient>
      </defs>
      {/* Sky circle background */}
      <circle cx="48" cy="48" r="46" fill="url(#hiw-sky-1)"/>
      {/* Mountains */}
      <path d="M10 62 L28 38 L40 54 L52 32 L70 62 Z" fill="#A8C9B8" opacity="0.55"/>
      {/* Ground */}
      <ellipse cx="48" cy="78" rx="40" ry="7" fill="#D8CFC0" opacity="0.5"/>
      {/* Trees */}
      <g>
        <path d="M16 64 L20 50 L24 64 Z" fill="url(#hiw-tree-1)"/>
        <path d="M14 58 L20 42 L26 58 Z" fill="url(#hiw-tree-1)"/>
        <rect x="19" y="64" width="2" height="5" fill="#6E4A2D"/>
      </g>
      <g>
        <path d="M76 66 L81 50 L86 66 Z" fill="url(#hiw-tree-1)"/>
        <path d="M74 60 L81 42 L88 60 Z" fill="url(#hiw-tree-1)"/>
        <rect x="80" y="66" width="2" height="5" fill="#6E4A2D"/>
      </g>
      {/* Travel trailer body with shadow */}
      <ellipse cx="50" cy="76" rx="26" ry="3.5" fill="#000" opacity="0.10"/>
      <rect x="24" y="38" width="48" height="30" rx="6" fill="url(#hiw-trailer-body)" stroke="#C7BFAE" strokeWidth="1"/>
      {/* Roof curve accent */}
      <path d="M24 44 Q48 36 72 44" stroke="#D8CFC0" strokeWidth="2" fill="none"/>
      {/* Stripe */}
      <rect x="24" y="56" width="48" height="5" fill="#8B5E3C" opacity="0.85"/>
      {/* Windows */}
      <rect x="31" y="45" width="11" height="8" rx="1.5" fill="#4A7C92"/>
      <rect x="48" y="45" width="11" height="8" rx="1.5" fill="#4A7C92"/>
      {/* Door */}
      <rect x="62" y="45" width="7" height="16" rx="1" fill="#5a4a3a"/>
      <circle cx="67.5" cy="53" r="0.7" fill="#F4A01C"/>
      {/* Wheels */}
      <circle cx="34" cy="69" r="5.5" fill="#2C2C2C"/>
      <circle cx="34" cy="69" r="2.3" fill="#8a8a8a"/>
      <circle cx="58" cy="69" r="5.5" fill="#2C2C2C"/>
      <circle cx="58" cy="69" r="2.3" fill="#8a8a8a"/>
      {/* Hitch */}
      <path d="M24 60 L14 60" stroke="#8a8a8a" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="13" cy="60" r="2.2" fill="#8a8a8a"/>
    </svg>
  ),

  // STEP 2 — Calendar with checkmark, plant accent, full color
  calendar: () => (
    <svg width="76" height="76" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hiw-sky-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCEFD0"/>
          <stop offset="100%" stopColor="#FDFAF5"/>
        </linearGradient>
        <linearGradient id="hiw-cal-header" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A8C6A"/>
          <stop offset="100%" stopColor="#2D4A2D"/>
        </linearGradient>
        <linearGradient id="hiw-cal-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#F6F3EC"/>
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="46" fill="url(#hiw-sky-2)"/>
      {/* Drop shadow under calendar */}
      <ellipse cx="49" cy="80" rx="22" ry="3.5" fill="#000" opacity="0.08"/>
      {/* Calendar body */}
      <rect x="24" y="26" width="50" height="48" rx="6" fill="url(#hiw-cal-body)" stroke="#E3DCCB" strokeWidth="1"/>
      {/* Header */}
      <path d="M24 32a6 6 0 0 1 6-6h38a6 6 0 0 1 6 6v8H24v-8z" fill="url(#hiw-cal-header)"/>
      {/* Binder rings */}
      <rect x="32" y="18" width="4" height="12" rx="2" fill="#8B5E3C"/>
      <rect x="62" y="18" width="4" height="12" rx="2" fill="#8B5E3C"/>
      {/* Grid dates */}
      {[0,1,2,3].map(r => [0,1,2,3,4].map(c => (
        <rect key={`${r}-${c}`} x={31 + c*8} y={45 + r*6} width="5.5" height="4" rx="1" fill={r===2&&c===2 ? "#F4A01C" : "#E3DCCB"} opacity={r===2&&c===2 ? "1" : "0.7"}/>
      )))}
      {/* Checkmark badge */}
      <circle cx="68" cy="64" r="13" fill="#fff"/>
      <circle cx="68" cy="64" r="13" fill="#4A7C59" opacity="0.12"/>
      <circle cx="68" cy="64" r="10.5" fill="none" stroke="#4A7C59" strokeWidth="2.2"/>
      <path d="M63 64l3.3 3.5L74 60" stroke="#2D4A2D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),

  // STEP 3 — Credit card with lock and shield, full color
  shield: () => (
    <svg width="76" height="76" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hiw-sky-3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E5EFE0"/>
          <stop offset="100%" stopColor="#FDFAF5"/>
        </linearGradient>
        <linearGradient id="hiw-card-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A5A3A"/>
          <stop offset="100%" stopColor="#1f3a1f"/>
        </linearGradient>
        <linearGradient id="hiw-shield-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A9468"/>
          <stop offset="100%" stopColor="#2D4A2D"/>
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="46" fill="url(#hiw-sky-3)"/>
      {/* Card shadow */}
      <ellipse cx="44" cy="74" rx="24" ry="3.5" fill="#000" opacity="0.08"/>
      {/* Credit card, slightly rotated */}
      <g transform="rotate(-8 44 48)">
        <rect x="18" y="34" width="52" height="32" rx="5" fill="url(#hiw-card-body)"/>
        <rect x="18" y="42" width="52" height="6" fill="#0f1f0f" opacity="0.5"/>
        <rect x="24" y="54" width="14" height="3" rx="1.5" fill="#F4A01C"/>
        <rect x="24" y="59" width="22" height="2.2" rx="1.1" fill="rgba(255,255,255,0.5)"/>
        {/* Chip */}
        <rect x="24" y="48" width="9" height="7" rx="1.5" fill="#F4A01C" opacity="0.9"/>
      </g>
      {/* Shield badge overlapping bottom right */}
      <ellipse cx="68" cy="74" rx="14" ry="3" fill="#000" opacity="0.07"/>
      <path d="M68 50 L80 54 v10 c0 9 -5.5 16 -12 19 -6.5 -3 -12 -10 -12 -19 V54 Z" fill="url(#hiw-shield-grad)" stroke="#1f3a1f" strokeWidth="0.5"/>
      <path d="M62 64 l4.5 4.5 8 -9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Lock accent floating upper right */}
      <g transform="translate(62,28)">
        <rect x="0" y="6" width="14" height="11" rx="2.5" fill="#F4A01C"/>
        <path d="M2.5 6v-2.5a4.5 4.5 0 0 1 9 0V6" stroke="#8B5E3C" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <circle cx="7" cy="11.5" r="1.4" fill="#6E4A2D"/>
      </g>
    </svg>
  ),

  // STEP 4 — Truck towing camper, road, sun
  truck: () => (
    <svg width="76" height="76" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hiw-bg-4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8F0E5"/>
          <stop offset="100%" stopColor="#FDFAF5"/>
        </linearGradient>
        <linearGradient id="hiw-clip-4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#EDEAE2"/>
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="46" fill="url(#hiw-bg-4)"/>
      <ellipse cx="46" cy="80" rx="27" ry="4" fill="#000" opacity="0.06"/>
      {/* Clipboard */}
      <rect x="25" y="19" width="35" height="50" rx="5" fill="url(#hiw-clip-4)" stroke="#C7BFAE" strokeWidth="1"/>
      <rect x="36" y="14" width="13" height="8" rx="2.4" fill="#2D4A2D"/>
      <rect x="31" y="30" width="26" height="2.4" rx="1.2" fill="#D8CFC0"/>
      <rect x="31" y="37" width="19" height="2.4" rx="1.2" fill="#D8CFC0"/>
      <rect x="31" y="44" width="22" height="2.4" rx="1.2" fill="#D8CFC0"/>
      {/* Check marks */}
      <circle cx="29.5" cy="31.2" r="1.8" fill="#4A7C59"/>
      <circle cx="29.5" cy="38.2" r="1.8" fill="#4A7C59"/>
      <circle cx="29.5" cy="45.2" r="1.8" fill="#4A7C59"/>
      {/* Key */}
      <g transform="translate(45,49) rotate(20)">
        <circle cx="6.4" cy="6.4" r="6.4" fill="none" stroke="#F4A01C" strokeWidth="3.2"/>
        <rect x="11" y="4.8" width="16" height="3.2" fill="#F4A01C"/>
        <rect x="22.4" y="8" width="3.2" height="4.8" fill="#F4A01C"/>
        <rect x="27.2" y="4.8" width="3.2" height="6.4" fill="#F4A01C"/>
      </g>
    </svg>
  ),
};

function HiwCard({ iconKey, glowColor, accentBg, step, stepNum, title, desc, delay = 0, visible = true }) {
  const [hov, setHov] = useState(false);
  const [iconAnim, setIconAnim] = useState(false);

  const handleEnter = () => {
    setHov(true);
    setIconAnim(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setIconAnim(true)));
  };
  const handleLeave = () => { setHov(false); setIconAnim(false); };

  return (
    <div
      style={{
        ...S.hiwCard,
        transform: hov ? "translateY(-12px)" : "translateY(0)",
        boxShadow: hov
          ? `0 24px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.07), 0 0 0 1px rgba(${glowColor === "#4A7C59" ? "74,124,89" : glowColor === "#F4A01C" ? "244,160,28" : glowColor === "#8B5E3C" ? "139,94,60" : "45,74,45"},0.12)`
          : "0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
        opacity: visible ? 1 : 0,
        animation: visible ? `wkcr-fadeup 0.7s cubic-bezier(0.25,0.46,0.45,0.94) both` : "none",
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={handleEnter} onMouseLeave={handleLeave}
    >
      {/* Top accent bar — expands on hover */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: hov ? "70%" : "40px", height: "3px",
        background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
        transition: "width 0.5s cubic-bezier(0.25,0.46,0.45,0.94)",
        borderRadius: "0 0 3px 3px",
        opacity: hov ? 1 : 0.45,
      }} />

      {/* Full-color illustration — focal point */}
      <div style={{ position: "relative", width: "118px", margin: "0 auto 28px", flexShrink: 0 }}>
        {/* Soft drop shadow beneath illustration */}
        <div style={{
          position: "absolute", inset: "-4px",
          borderRadius: "50%",
          boxShadow: hov
            ? `0 16px 38px ${glowColor}35, 0 4px 14px rgba(0,0,0,0.08)`
            : "0 8px 22px rgba(0,0,0,0.10)",
          transition: "box-shadow 0.4s ease",
          pointerEvents: "none",
        }} />
        <div style={{
          width: "118px", height: "118px",
          borderRadius: "50%",
          overflow: "hidden",
          background: "#fff",
          border: `2px solid ${glowColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: hov ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          animation: iconAnim ? "wkcr-bounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97)" : "none",
        }}>
          {HIW_ICONS[iconKey]()}
        </div>
        <div style={S.hiwStepNum}>{stepNum}</div>
      </div>

      <div style={S.hiwTitle}>{title}</div>
      <div style={S.hiwDesc}>{desc}</div>
    </div>
  );
}

function WhyCard({ item, i, visible }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...S.whyItem,
        transform: hov ? "translateY(-10px)" : "translateY(0)",
        boxShadow: hov
          ? `0 20px 52px rgba(0,0,0,0.11), 0 4px 14px rgba(0,0,0,0.06), 0 0 0 1px ${item.accentColor}18`
          : "0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
        opacity: visible ? 1 : 0,
        animation: visible ? `wkcr-fadeup 0.65s cubic-bezier(0.25,0.46,0.45,0.94) both` : "none",
        animationDelay: `${i * 130}ms`,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: hov ? "65%" : "36px", height: "3px",
        background: `linear-gradient(90deg, transparent, ${item.accentColor}, transparent)`,
        transition: "width 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",
        borderRadius: "0 0 3px 3px",
        opacity: hov ? 1 : 0.4,
      }} />

      {/* Icon badge — full-color illustration */}
      <div style={{
        ...S.whyIconWrap,
        boxShadow: hov
          ? `0 16px 38px ${item.accentColor}30, 0 4px 14px rgba(0,0,0,0.08)`
          : "0 8px 22px rgba(0,0,0,0.08)",
        transform: hov ? "scale(1.06)" : "scale(1)",
      }}>
        {item.svg}
      </div>

      <div style={S.whyTitle}>{item.title}</div>
      <div style={S.whyDesc}>{item.desc}</div>
    </div>
  );
}

function FleetCard({ img, badge, name, sleeps, desc, amenities, visible = true, delay = 0, setPage, camperKey }) {
  const [hov, setHov] = useState(false);
  const [btnHov, setBtnHov] = useState(false);
  return (
    <div
      style={{
        ...S.fleetCard,
        transform: hov ? "translateY(-10px)" : "translateY(0)",
        boxShadow: hov ? "0 24px 56px rgba(0,0,0,0.16)" : S.fleetCard.boxShadow,
        opacity: visible ? 1 : 0,
        animation: visible ? `wkcr-fadeup 0.65s ease both` : "none",
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      {/* Image wrapper for zoom */}
      <div style={{ overflow: "hidden", borderRadius: "24px 24px 0 0" }}>
        <img src={img} alt={name} style={{
          ...S.fleetImg,
          transform: hov ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }} />
      </div>
      <div style={S.fleetBody}>
        <div style={S.fleetBadge}>{badge}</div>
        <div style={S.fleetName}>{name}</div>
        <div style={S.fleetMeta}>
          <span>👥</span> Sleeps {sleeps}
        </div>
        <div style={S.fleetDesc}>{desc}</div>
        <div style={S.fleetAmenities}>
          {amenities.map(a => <span key={a} style={S.fleetAmenity}>{a}</span>)}
        </div>
        <button
          style={{
            ...S.btnForest,
            transform: btnHov ? "translateY(-2px)" : "translateY(0)",
            boxShadow: btnHov ? "0 8px 24px rgba(45,74,45,0.38)" : "0 2px 8px rgba(45,74,45,0.15)",
            background: btnHov ? C.sage : C.forest,
            transition: "background 0.25s, transform 0.2s, box-shadow 0.25s",
          }}
          onMouseEnter={() => setBtnHov(true)}
          onMouseLeave={() => setBtnHov(false)}
          onClick={() => {
            setPage("camper-detail", camperKey);
            window.scrollTo(0, 0);
          }}
        >View Details</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// ── Shared Nav ────────────────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = page === "home";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on page change
  const navigate = (key) => {
    setMenuOpen(false);
    setPage(key);
    window.scrollTo(0, 0);
  };

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navBg = isHome
    ? (scrolled ? "rgba(29,42,29,0.97)" : "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)")
    : "rgba(29,42,29,0.97)";

  const NAV_LINKS = [
    { label: "Home", key: "home" },
    { label: "Our Fleet", key: "fleet" },
    { label: "Meet Us", key: "about" },
    { label: "FAQ", key: "faq" },
    { label: "Contact", key: "contact" },
  ];

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(20px,4vw,60px)", height: "72px",
        background: menuOpen ? "rgba(29,42,29,0.99)" : navBg,
        backdropFilter: (scrolled || !isHome || menuOpen) ? "blur(12px)" : "none",
        transition: "background 0.4s ease",
        borderBottom: (scrolled || !isHome || menuOpen) ? "1px solid rgba(255,255,255,0.08)" : "none",
      }}>
        {/* Logo + brand */}
        <div style={S.navBrand} onClick={() => navigate("home")} role="button">
          <img src={IMAGES.logo} alt="" style={S.navLogo} />
          <span style={S.navBrandText}>Western KY Camper Rentals, LLC</span>
        </div>

        {/* Desktop links — hidden below 768px via inline media workaround */}
        <ul style={{ ...S.navLinks, display: "flex" }} className="wkcr-nav-desktop">
          {NAV_LINKS.map(({ label, key }) => (
            <li key={label}>
              <a
                style={{
                  ...S.navLink,
                  opacity: page === key ? 1 : 0.85,
                  borderBottom: page === key ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
                  paddingBottom: "2px",
                }}
                href="#"
                onClick={e => { e.preventDefault(); navigate(key); }}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = page === key ? "1" : "0.85"}
              >{label}</a>
            </li>
          ))}
        </ul>

        {/* Hamburger button — shown on mobile */}
        <button
          className="wkcr-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          style={{
            display: "none", // shown via CSS
            background: "none", border: "none", cursor: "pointer",
            padding: "8px", borderRadius: "8px",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "5px", width: "40px", height: "40px",
          }}
        >
          {/* Animated burger bars */}
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: "block", width: "22px", height: "2px",
              background: "#fff", borderRadius: "2px",
              transition: "transform 0.3s ease, opacity 0.3s ease",
              transform: menuOpen
                ? i === 0 ? "translateY(7px) rotate(45deg)"
                : i === 2 ? "translateY(-7px) rotate(-45deg)"
                : "scaleX(0)"
                : "none",
              opacity: menuOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile drawer menu */}
      <div style={{
        position: "fixed", top: "72px", left: 0, right: 0, bottom: 0,
        zIndex: 199,
        background: "rgba(22,35,22,0.98)",
        backdropFilter: "blur(16px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "8px",
        opacity: menuOpen ? 1 : 0,
        pointerEvents: menuOpen ? "all" : "none",
        transition: "opacity 0.3s ease",
      }} className="wkcr-mobile-menu">
        {NAV_LINKS.map(({ label, key }, i) => (
          <a
            key={key}
            href="#"
            onClick={e => { e.preventDefault(); navigate(key); }}
            style={{
              color: page === key ? "#F4A01C" : "#fff",
              textDecoration: "none",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 6vw, 36px)",
              letterSpacing: "0.01em",
              padding: "14px 0",
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 0.4s ease ${i * 60}ms, transform 0.4s ease ${i * 60}ms`,
              borderBottom: page === key ? `2px solid #F4A01C` : "2px solid transparent",
            }}
          >{label}</a>
        ))}

        {/* CTA in mobile menu */}
        <button
          onClick={() => { trackEvent("check_availability_click", { location: "mobile_menu" }); navigate("fleet"); }}
          style={{
            marginTop: "24px",
            background: "#8B5E3C", color: "#fff",
            border: "none", borderRadius: "50px",
            padding: "14px 40px",
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "16px",
            cursor: "pointer",
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? "translateY(0)" : "translateY(16px)",
            transition: `opacity 0.4s ease 300ms, transform 0.4s ease 300ms`,
            boxShadow: "0 4px 20px rgba(139,94,60,0.4)",
          }}
        >Check Availability</button>

        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: "13px",
          color: "rgba(255,255,255,0.4)", marginTop: "20px",
          opacity: menuOpen ? 1 : 0,
          transition: "opacity 0.4s ease 360ms",
        }}>(270) 820-8685</p>
      </div>
    </>
  );
}


// ── Shared Footer ─────────────────────────────────────────────────────────────
function Footer({ setPage }) {
  return (
    <footer style={S.footer}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
        <img src={IMAGES.logo} alt="" style={{ height: "40px", width: "auto" }} />
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "18px", color: "rgba(255,255,255,0.85)", letterSpacing: "0.01em" }}>Western KY Camper Rentals, LLC</span>
      </div>
      <ul style={S.footerLinks}>
        {[
          { label: "Home", key: "home" },
          { label: "Our Fleet", key: "fleet" },
          { label: "Meet Us", key: "about" },
          { label: "FAQ", key: "faq" },
          { label: "Contact", key: "contact" },
        ].map(({ label, key }) => (
          <li key={label}>
            <a href="#" style={S.footerLink}
              onClick={e => { e.preventDefault(); setPage(key); window.scrollTo(0,0); }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.6)"}
            >{label}</a>
          </li>
        ))}
      </ul>
      <p style={S.footerText}>
        Serving Western Kentucky · Indiana · Tennessee · Delivered & Set Up To Your Location<br />
        © 2025 Western KY Camper Rentals, LLC · All rights reserved
      </p>
    </footer>
  );
}

// ── Reviews data ──────────────────────────────────────────────────────────────
const REVIEWS = [
  {
    quote: "We had an amazing experience renting from Western KY Camper Rentals for our Memorial Day weekend trip to Jellystone Mammoth Cave! The camper was exceptionally clean, well-maintained, and stocked with every amenity we could possibly need. We were especially impressed by the thoughtful Memorial Day decorations they put up — it made our stay feel extra special and welcoming. Communication was outstanding from start to finish. They were incredibly responsive, attentive, and made sure we had everything we needed throughout our trip. It's clear they genuinely care about their customers and take pride in providing a top-notch camping experience. If you're looking for a stress-free camper rental with excellent customer service, I highly recommend Western Kentucky Campers. We will definitely be renting from them again!",
    name: "Samantha B.",
    tag: "Jellystone Park Mammoth Cave",
    verified: true,
    wide: true,
    photo: "/images/homepage/review-photo.jpg",
  },
  {
    quote: "This is our second time using Western KY Camper Rentals. It was a great experience just like the first time. They brought it to the campground, set it up, and explained everything we needed to know. The camper has everything you need! Super easy to work with and a clean camper! Highly recommend!",
    name: "Candace Tillman",
    tag: "Family Vacation",
    verified: true,
  },
  {
    quote: "They are such nice people and great to work with. The camper is very nice and the layout is great for a family. Cannot go wrong booking with them. We will be booking again!",
    name: "Cody Field",
    tag: "US 60 Dragway",
    verified: true,
  },
  {
    quote: "Absolutely amazing! Great people to rent from!",
    name: "Sarah J.",
    tag: "Verified Guest",
    verified: true,
  },
  {
    quote: "Truly the best customer service around! They go above and beyond to communicate and make sure the rental is just as perfect as can be so you have zero stress for your stay! We are repeat customers and plan to be for a very long time!",
    name: "Danielle C.",
    tag: "Repeat Guest",
    verified: true,
  },
  {
    quote: "The Rust family are great, honest people! Insured owners of 2 beautiful campers that they will drop off and set up for you. All that's left for you is to enjoy your stay and relax! If you're looking to rent a camper, Western KY Camper Rentals is the best!",
    name: "Denise J.",
    tag: "Verified Guest",
    verified: true,
  },
  {
    quote: "Great customer service. Very nice accommodations. Everything was set up and ready when we arrived.",
    name: "Mark J.",
    tag: "Verified Guest",
    verified: true,
  },
  {
    quote: "Great camper. The hosts are fast, friendly and affordable. Met above our expectations. Recommend to anyone. Very clean!",
    name: "Donna M.",
    tag: "Verified Guest",
    verified: true,
  },
  {
    quote: "The camper was really nice and they were very helpful with all of our questions. Thank you!",
    name: "Michael N.",
    tag: "Union Co Expo Center",
    verified: true,
  },
  {
    quote: "I highly recommend Western KY Camper Rentals!!! The owners were beyond amazing, the communication was incredible, and the camper was exactly as pictured! If you are looking on renting a camper I 20/10 recommended! Thank you Western KY Camper Rentals for allowing me and my friends to rent your camper for the weekend — looking forward to renting again for future events!",
    name: "Katlin V.",
    tag: "Gregory Lake",
    verified: true,
  },
  {
    quote: "Highly recommend! They took the camper down, set everything up, and it was ready to go when we got there. The camper had everything we needed and is spacious. Loved having a door to outside and our own bathroom in the master. Emily was very quick to respond to any questions and super nice.",
    name: "Candace T.",
    tag: "Moors Campground",
    verified: true,
  },
  {
    quote: "Great people and the hospitality is top notch. I highly recommend this business to take care of all your camping rental needs.",
    name: "Mike C.",
    tag: "US 60 Dragway",
    verified: true,
  },
  {
    quote: "Amazing people and amazing camper! Highly recommend.",
    name: "Jennifer R.",
    tag: "Verified Guest",
    verified: true,
  },
  {
    quote: "They are awesome at getting delivered and set up for you to enjoy your time! Prices are great as well!",
    name: "Tammy R.",
    tag: "Verified Guest",
    verified: true,
  },
  {
    quote: "Excellent people to deal with, great service and always on time.",
    name: "Nathan H.",
    tag: "Verified Guest",
    verified: true,
  },
];

function ReviewCard({ review, visible, delay, onPauseChange }) {
  const [hov, setHov] = useState(false);

  // Generate initials avatar color from name
  const avatarColors = ["#2D4A2D","#4A7C59","#8B5E3C","#6E4A2D","#3a5a3a","#5a4a2a"];
  const colorIdx = review.name.charCodeAt(0) % avatarColors.length;
  const initials = review.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  const handleEnter = () => { setHov(true); onPauseChange && onPauseChange(true); };
  const handleLeave = () => { setHov(false); onPauseChange && onPauseChange(false); };

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        background: "#fff",
        borderRadius: "22px",
        padding: "32px 38px 28px",
        boxShadow: hov
          ? "0 22px 56px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.05)"
          : "0 2px 18px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)",
        border: "1px solid rgba(45,74,45,0.08)",
        display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-6px)" : "translateY(0)",
        transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.3s ease",
        opacity: visible ? 1 : 0,
        animation: visible ? "wkcr-fadeup 0.65s cubic-bezier(0.25,0.46,0.45,0.94) both" : "none",
        animationDelay: `${delay}ms`,
        boxSizing: "border-box",
        alignSelf: "start",
      }}
    >
      {/* Top gold accent bar */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: hov ? "65%" : "36px", height: "3px",
        background: "linear-gradient(90deg, transparent, #F4A01C, transparent)",
        transition: "width 0.45s ease",
        borderRadius: "0 0 3px 3px",
        opacity: hov ? 1 : 0.5,
      }} />

      {/* Decorative quote mark */}
      <div style={{
        position: "absolute", top: "10px", right: "22px",
        fontFamily: "Georgia, serif", fontSize: "76px", lineHeight: 1,
        color: "rgba(244,160,28,0.09)", fontWeight: 700,
        userSelect: "none", pointerEvents: "none", letterSpacing: "-4px",
      }}>"</div>

      {/* Stars */}
      <div style={{ display: "flex", gap: "3px", marginBottom: "14px" }}>
        {[...Array(5)].map((_, i) => (
          <svg key={i} width="18" height="18" viewBox="0 0 20 20" fill="#F4A01C">
            <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
          </svg>
        ))}
      </div>

      {/* Content row: photo (if any) beside text, to keep card shorter */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px", alignItems: "flex-start" }}>
        {review.photo && (
          <img src={review.photo} alt="" style={{
            width: "120px", height: "120px", objectFit: "cover",
            borderRadius: "14px", flexShrink: 0,
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
          }} />
        )}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          color: "#3a3a3a", fontSize: "15.5px", lineHeight: 1.7,
          margin: 0, fontStyle: "italic",
        }}>"{review.quote}"</p>
      </div>

      {/* Footer: avatar + name/tag + Google badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Initial avatar */}
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: avatarColors[colorIdx],
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "14px", color: "#fff" }}>{initials}</span>
          </div>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700, color: "#1C1C1C", fontSize: "17px", marginBottom: "2px",
              lineHeight: 1.2,
            }}>{review.name}</div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              color: "#4A7C59", fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>{review.tag}</div>
          </div>
        </div>

        {/* Google verified badge — compact, aligned with name */}
        {review.verified && (
          <div style={{
            display: "flex", alignItems: "center", gap: "3px",
            background: "rgba(66,133,244,0.07)", borderRadius: "50px",
            padding: "3px 7px", border: "1px solid rgba(66,133,244,0.18)",
            flexShrink: 0,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, color: "#4285F4", letterSpacing: "0.04em" }}>Google Review</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsSection({ reviewsRef, reviewsVisible, setPage, reviews = REVIEWS }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef(null);
  const total = reviews.length;
  const perPage = Math.min(isMobile ? 1 : 2, total);

  // Build pages: wide reviews get their own solo page, others pair up normally
  const pages = useMemo(() => {
    const result = [];
    let buffer = [];
    reviews.forEach((review) => {
      if (review.wide || isMobile) {
        if (buffer.length) { result.push(buffer); buffer = []; }
        result.push([review]);
      } else {
        buffer.push(review);
        if (buffer.length === perPage) { result.push(buffer); buffer = []; }
      }
    });
    if (buffer.length) result.push(buffer);
    return result;
  }, [perPage, isMobile]);

  const pageCount = pages.length;
  const maxSlide = pageCount - 1;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const goTo = useCallback((idx, dir) => {
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => { setCurrent(idx); setAnimating(false); }, 50);
  }, []);

  const next = useCallback(() => goTo(current >= maxSlide ? 0 : current + 1, 1), [current, maxSlide, goTo]);
  const prev = useCallback(() => goTo(current <= 0 ? maxSlide : current - 1, -1), [current, maxSlide, goTo]);

  // Auto-advance — slow, 11 seconds, pauses on hover/touch/card focus
  useEffect(() => {
    if (paused || cardHovered || pageCount <= 1) return;
    timerRef.current = setTimeout(next, 11000);
    return () => clearTimeout(timerRef.current);
  }, [paused, cardHovered, next, total, perPage, current]);

  const touchStart = useRef(null);
  const onTouchStart = e => { touchStart.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = e => {
    if (touchStart.current !== null) {
      const diff = touchStart.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    }
    touchStart.current = null;
    setTimeout(() => setPaused(false), 600);
  };

  const arrowBtn = (onClick, dir) => (
    <button onClick={onClick} style={{
      width: "38px", height: "38px", borderRadius: "50%",
      background: "#fff", border: "1px solid rgba(45,74,45,0.15)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", flexShrink: 0,
      transition: "background 0.22s, box-shadow 0.22s, transform 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "#2D4A2D"; e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(45,74,45,0.28)"; e.currentTarget.querySelector("svg").style.stroke = "#fff"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; e.currentTarget.querySelector("svg").style.stroke = "#2D4A2D"; }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ stroke: "#2D4A2D", transition: "stroke 0.2s" }}>
        {dir === "left"
          ? <path d="M10 3L5 8l5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M6 3l5 5-5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        }
      </svg>
    </button>
  );

  return (
    <section
      ref={reviewsRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        background: "linear-gradient(160deg, #FDFAF5 0%, #F8F2E8 50%, #FDFAF5 100%)",
        padding: "96px clamp(24px, 6vw, 80px) 80px",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Ambient orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "8%", right: "4%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244,160,28,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "3%", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,124,89,0.07) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: "52px", position: "relative", zIndex: 1,
        opacity: reviewsVisible ? 1 : 0,
        transform: reviewsVisible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}>
        {/* Premium Google trust badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "26px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "16px",
            background: "linear-gradient(135deg, #2D4A2D 0%, #1f3a1f 100%)",
            border: "1.5px solid rgba(244,160,28,0.55)",
            borderRadius: "50px",
            padding: "14px 28px",
            boxShadow: "0 8px 32px rgba(45,74,45,0.28), 0 0 0 1px rgba(244,160,28,0.08), 0 0 24px rgba(244,160,28,0.10)",
          }}>
            {/* Google G logo */}
            <svg width="26" height="26" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>

            {/* "Google Reviews" text */}
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700, fontSize: "17px", color: "#fff",
              letterSpacing: "0.01em", whiteSpace: "nowrap",
            }}>Google Reviews</span>

            {/* Gold vertical divider */}
            <div style={{ width: "1.5px", height: "32px", background: "linear-gradient(to bottom, transparent, rgba(244,160,28,0.6), transparent)" }} />

            {/* Stars + rating */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div style={{ display: "flex", gap: "1px" }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#F4A01C">
                    <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                  </svg>
                ))}
              </div>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700, fontSize: "11px", color: "#F4A01C",
                letterSpacing: "0.04em", whiteSpace: "nowrap",
              }}>5.0 Rating</span>
            </div>
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#4A7C59", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "16px" }}>
          <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#4A7C59", opacity: 0.5 }} />
          Guest Reviews
          <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#4A7C59", opacity: 0.5 }} />
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700, color: "#1C1C1C",
          fontSize: "clamp(30px, 4.5vw, 52px)",
          lineHeight: 1.1, margin: "0 0 16px",
          letterSpacing: "-0.02em",
        }}>Happy Campers</h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          color: "#6B7B6B", fontSize: "17px", lineHeight: 1.65,
          maxWidth: "560px", margin: "0 auto",
        }}>Real reviews from real guests who made lasting memories with Western KY Camper Rentals.</p>
      </div>

      {/* Carousel */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: pageCount <= 1 ? "640px" : "1480px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {pageCount > 1 && arrowBtn(prev, "left")}

          <div style={{ flex: 1, overflow: "hidden" }}>
            <div
              key={current}
              style={{
                display: "grid",
                gridTemplateColumns: pages[current] && pages[current].length === 1
                  ? "1fr"
                  : pages[current].map(r => r.photo ? "1.4fr" : "1fr").join(" "),
                gap: "32px",
                opacity: animating ? 0 : 1,
                transform: animating
                  ? `translateX(${direction > 0 ? "-24px" : "24px"})`
                  : "translateX(0)",
                transition: "opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {(pages[current] || []).map((review, i) => (
                <ReviewCard
                  key={current + i}
                  review={review}
                  visible={reviewsVisible}
                  delay={i * 100}
                  onPauseChange={setCardHovered}
                />
              ))}
            </div>
          </div>

          {pageCount > 1 && arrowBtn(next, "right")}
        </div>

        {/* Dots */}
        {pageCount > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "7px", marginTop: "32px" }}>
            {[...Array(maxSlide + 1)].map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? 1 : -1)}
                style={{
                  width: current === i ? "22px" : "7px",
                  height: "7px", borderRadius: "4px",
                  background: current === i ? "#2D4A2D" : "rgba(45,74,45,0.2)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "width 0.3s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div style={{
        display: "flex", gap: "14px", justifyContent: "center",
        flexWrap: "wrap", marginTop: "36px",
        position: "relative", zIndex: 1,
        opacity: reviewsVisible ? 1 : 0,
        transition: "opacity 0.8s ease 0.4s",
      }}>
        <a
          href="https://share.google/mWfoHSF3pkE3Z6EF5"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#fff", color: "#2D4A2D",
            border: "2px solid rgba(45,74,45,0.22)",
            borderRadius: "50px", padding: "13px 30px",
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px",
            textDecoration: "none", letterSpacing: "0.03em",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            transition: "background 0.22s, color 0.22s, transform 0.2s, border-color 0.22s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#2D4A2D"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#2D4A2D"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#2D4A2D"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(45,74,45,0.22)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Read More Reviews
        </a>
        <button
          onClick={() => { trackEvent("check_availability_click", { location: "nav_bar" }); setPage("fleet"); window.scrollTo(0, 0); }}
          style={{
            background: "#F4A01C", color: "#fff",
            border: "none", borderRadius: "50px", padding: "13px 30px",
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "15px",
            cursor: "pointer", letterSpacing: "0.03em",
            boxShadow: "0 4px 20px rgba(244,160,28,0.38)",
            transition: "background 0.22s, transform 0.2s, box-shadow 0.22s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#d4890f"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(244,160,28,0.48)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F4A01C"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(244,160,28,0.38)"; }}
        >Check Availability</button>
      </div>
    </section>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ setPage }) {

  const [heroVisible, setHeroVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    // Google Fonts (also injected by root App)

    // Inject keyframes for icon bounce + fade-up
    const style = document.createElement("style");
    style.textContent = `
      @keyframes wkcr-bounce {
        0%   { transform: scale(1) translateY(0); }
        40%  { transform: scale(1.18) translateY(-5px); }
        65%  { transform: scale(0.95) translateY(2px); }
        85%  { transform: scale(1.06) translateY(-2px); }
        100% { transform: scale(1) translateY(0); }
      }
      @keyframes wkcr-fadeup {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes wkcr-fadein {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes wkcr-goldpulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,160,28,0.0); }
        50%       { box-shadow: 0 0 0 8px rgba(244,160,28,0.18); }
      }
      .wkcr-hiw-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        max-width: 1260px;
        margin: 0 auto;
        align-items: stretch;
      }
      @media (max-width: 960px) {
        .wkcr-hiw-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
      }
      @media (max-width: 560px) {
        .wkcr-hiw-grid { grid-template-columns: 1fr; gap: 16px; }
      }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => setHeroVisible(true), 100);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      if (!prefersReduced) setParallaxY(window.scrollY * 0.28);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal refs for each section
  const [hiwRef, hiwVisible]     = useScrollReveal();
  const [fleetRef, fleetVisible] = useScrollReveal();
  const [whyRef, whyVisible]     = useScrollReveal();
  const [ownersRef, ownersVisible] = useScrollReveal();
  const [galleryRef, galleryVisible] = useScrollReveal();
  const [reviewsRef, reviewsVisible] = useScrollReveal();
  const [ctaRef, ctaVisible]     = useScrollReveal();

  return (
    <div style={{ margin: 0, padding: 0, background: C.cream }}>

      <Nav page="home" setPage={setPage} />

      {/* ── HERO ── */}
      <section style={S.hero}>
        <div style={{
          ...S.heroBg,
          backgroundImage: `url(${IMAGES.hero})`,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? `scale(1.08) translateY(${parallaxY}px)` : "scale(1.12) translateY(0px)",
          transition: "opacity 1.2s ease",
          willChange: "transform",
        }} />
        <div style={S.heroOverlay} />

        <div style={{
          ...S.heroContent,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 1s ease 0.4s, transform 1s ease 0.4s",
        }}>
          <div style={S.heroEyebrow}>Proudly Serving Kentucky • Indiana • Tennessee</div>
          <h1 style={S.heroH1}>Your Adventure<br />Starts Here.</h1>
          <p style={S.heroSub}>
            Comfortable, fully equipped camper rentals delivered and set up to your location of choice — so you can focus on making memories.
          </p>
          <div style={S.heroBtns}>
            <button
              style={S.btnPrimary}
              onClick={() => { trackEvent("check_availability_click", { location: "hero" }); setPage("fleet"); window.scrollTo(0,0); }}
              onMouseEnter={e => { e.target.style.background = C.bronzeHover; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(139,94,60,0.5)"; }}
              onMouseLeave={e => { e.target.style.background = C.bronze; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = S.btnPrimary.boxShadow; }}
            >Check Availability</button>
            <button
              style={S.btnOutline}
              onClick={() => document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" })}
              onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.22)"; e.target.style.borderColor = "rgba(255,255,255,0.9)"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 24px rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.target.style.background = S.btnOutline.background; e.target.style.borderColor = "rgba(255,255,255,0.5)"; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}
            >View Our Campers</button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: "36px", left: "50%", transform: "translateX(-50%)",
          zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          opacity: heroVisible ? 0.7 : 0, transition: "opacity 1s ease 1.2s",
        }}>
          <span style={{ color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Scroll</span>
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)" }} />
        </div>
      </section>

      {/* ── DIVIDER hero → HIW: scalloped wave with centered camper accent ── */}
      <div style={{ background: "linear-gradient(160deg,#FDFAF5 0%,#F8F2E8 50%,#FDFAF5 100%)", lineHeight: 0, marginTop: "-1px", position: "relative" }}>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "90px" }}>
          <defs>
            <linearGradient id="wkcr-divider-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4A7C59"/>
              <stop offset="50%" stopColor="#2D4A2D"/>
              <stop offset="100%" stopColor="#4A7C59"/>
            </linearGradient>
          </defs>
          {/* Soft scalloped wave rising into cream */}
          <path
            d="M0,90 
               C120,40 240,40 360,62 
               C480,84 600,84 720,55 
               C840,26 960,26 1080,52 
               C1200,78 1320,78 1440,40 
               L1440,90 L0,90 Z"
            fill="#FDFAF5"
          />
          {/* Thin gold accent line tracing the wave crest */}
          <path
            d="M0,90 
               C120,40 240,40 360,62 
               C480,84 600,84 720,55 
               C840,26 960,26 1080,52 
               C1200,78 1320,78 1440,40"
            fill="none" stroke="#F4A01C" strokeWidth="2" strokeOpacity="0.45" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section style={S.hiw} ref={hiwRef}>
        {/* Top wave cutout from hero black */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, lineHeight: 0, zIndex: 0 }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "80px" }}>
            <path d="M0,80 C360,20 720,80 1080,32 C1260,10 1380,60 1440,80 L1440,0 L0,0 Z" fill="#000" opacity="0"/>
          </svg>
        </div>

        {/* Ambient background orbs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "10%", left: "8%", width: "340px", height: "340px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244,160,28,0.07) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "12%", right: "6%", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,124,89,0.06) 0%, transparent 70%)" }} />
        </div>

        <div style={S.hiwInner}>
          {/* Section header */}
          <div style={{
            position: "relative", zIndex: 1,
            opacity: hiwVisible ? 1 : 0,
            transform: hiwVisible ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.75s ease, transform 0.75s ease",
          }}>
            <div style={S.hiwEyebrow}>
              <span style={{ display: "inline-block", width: "32px", height: "1px", background: C.sage, opacity: 0.5 }} />
              Simple &amp; Stress-Free
              <span style={{ display: "inline-block", width: "32px", height: "1px", background: C.sage, opacity: 0.5 }} />
            </div>
            <h2 style={S.hiwH2}>How It Works</h2>
            <p style={S.hiwSubtitle}>From the first inquiry to the end of your trip, we make the process simple so you can focus on enjoying your trip.</p>
          </div>

          {/* Cards */}
          <div className="wkcr-hiw-grid" style={{ position: "relative", zIndex: 1 }}>
            <HiwCard
              iconKey="trailer" stepNum="1" step="Step 01"
              glowColor="#4A7C59" accentBg="rgba(74,124,89,0.08)"
              title="Choose Your Camper"
              desc="Browse our camper lineup and choose the perfect camper for your trip, vacation, race weekend, festival, or special event."
              visible={hiwVisible} delay={0}
            />
            <HiwCard
              iconKey="calendar" stepNum="2" step="Step 02"
              glowColor="#F4A01C" accentBg="rgba(244,160,28,0.09)"
              title="Check Availability & Request a Quote"
              desc="Check availability and complete our booking request form to receive a personalized quote. We'll email you to finalize the details and answer any questions."
              visible={hiwVisible} delay={140}
            />
            <HiwCard
              iconKey="shield" stepNum="3" step="Step 03"
              glowColor="#8B5E3C" accentBg="rgba(139,94,60,0.08)"
              title="Secure Your Stay"
              desc="Review your quote, pay your invoice or the $200 booking deposit, and sign the rental agreement to officially reserve your camper. We accept debit, credit, PayPal, Venmo, Affirm."
              visible={hiwVisible} delay={280}
            />
            <HiwCard
              iconKey="truck" stepNum="4" step="Step 04"
              glowColor="#2D4A2D" accentBg="rgba(45,74,45,0.08)"
              title="We Deliver & Set Up"
              desc="We'll deliver, level, and fully set up your camper. Please be present for a quick walkthrough. Just bring your food, clothes, and toiletries — we'll take care of the rest!"
              visible={hiwVisible} delay={420}
            />
          </div>
        </div>

        {/* Bottom wave into fleet sand — scalloped with gold accent */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0, zIndex: 0 }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "80px" }}>
            <path
              d="M0,80 
                 C120,30 240,30 360,50 
                 C480,70 600,70 720,42 
                 C840,14 960,14 1080,38 
                 C1200,62 1320,62 1440,24 
                 L1440,80 L0,80 Z"
              fill={C.sand}
            />
            <path
              d="M0,80 
                 C120,30 240,30 360,50 
                 C480,70 600,70 720,42 
                 C840,14 960,14 1080,38 
                 C1200,62 1320,62 1440,24"
              fill="none" stroke="#F4A01C" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"
            />
          </svg>
        </div>
      </section>

      {/* ── FEATURED CAMPERS ── */}
      <section style={S.fleet} id="fleet" ref={fleetRef}>
        <div style={{
          ...S.fleetHeader,
          opacity: fleetVisible ? 1 : 0,
          transform: fleetVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={S.sectionEyebrow}>Our Fleet</div>
          <h2 style={S.sectionH2}>Find Your Perfect Camper</h2>
          <p style={{ ...S.sectionSubtitle, marginBottom: 0 }}>Whether you're planning a family vacation, race weekend, music festival, or special event, we have a camper ready for your next adventure.</p>
        </div>
        <div style={S.fleetGrid}>
          {FLEET_DATA.map((camper, i) => (
            <FleetCard
              key={camper.id}
              img={camper.heroImg}
              badge={camper.badge}
              name={camper.name}
              sleeps={camper.sleeps}
              desc={camper.tagline}
              amenities={(camper.id === "aspen-trail"
                ? camper.amenities.filter(a => a.label !== "34 ft" && a.label !== "50 Amp")
                : camper.amenities
              ).slice(0, 4).map(a => a.label)}
              visible={fleetVisible}
              delay={100 + i * 140}
              setPage={setPage}
              camperKey={camper.id}
            />
          ))}
        </div>
      </section>

      {/* ── DIVIDER fleet → why: scalloped wave ── */}
      <div style={{ background: C.cream, lineHeight: 0, position: "relative" }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "60px" }}>
          <path
            d="M0,0 
               C120,34 240,34 360,20 
               C480,6 600,6 720,24 
               C840,42 960,42 1080,26 
               C1200,10 1320,10 1440,34 
               L1440,0 L0,0 Z"
            fill={C.sand}
          />
          <path
            d="M0,0 
               C120,34 240,34 360,20 
               C480,6 600,6 720,24 
               C840,42 960,42 1080,26 
               C1200,10 1320,10 1440,34"
            fill="none" stroke="#F4A01C" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── WHY CHOOSE US ── */}
      <section style={S.why} ref={whyRef}>

        {/* Ambient orbs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "5%", right: "5%", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244,160,28,0.07) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "8%", left: "3%", width: "260px", height: "260px", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,124,89,0.06) 0%, transparent 70%)" }} />
        </div>

        {/* Header */}
        <div style={{
          position: "relative", zIndex: 1,
          opacity: whyVisible ? 1 : 0,
          transform: whyVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.65s ease, transform 0.65s ease",
          marginBottom: "60px",
        }}>
          <div style={S.sectionEyebrow}>Why Choose Us</div>
          <h2 style={S.sectionH2}>The Details Matter</h2>
        </div>

        {/* Cards */}
        <div className="wkcr-why-grid" style={{ ...S.whyGrid, position: "relative", zIndex: 1 }}>
          {[
            {
              accentColor: "#4A7C59", accentBg: "rgba(74,124,89,0.09)",
              svg: (
                <svg width="100" height="100" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="why-bg-1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8F0E5"/>
                      <stop offset="100%" stopColor="#FDFAF5"/>
                    </linearGradient>
                    <linearGradient id="why-clip-1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF"/>
                      <stop offset="100%" stopColor="#EDEAE2"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="58" fill="url(#why-bg-1)"/>
                  <ellipse cx="58" cy="100" rx="34" ry="5" fill="#000" opacity="0.06"/>
                  {/* Clipboard */}
                  <rect x="32" y="24" width="44" height="62" rx="6" fill="url(#why-clip-1)" stroke="#C7BFAE" strokeWidth="1"/>
                  <rect x="46" y="18" width="16" height="10" rx="3" fill="#2D4A2D"/>
                  <rect x="40" y="38" width="32" height="3" rx="1.5" fill="#D8CFC0"/>
                  <rect x="40" y="46" width="24" height="3" rx="1.5" fill="#D8CFC0"/>
                  <rect x="40" y="54" width="28" height="3" rx="1.5" fill="#D8CFC0"/>
                  {/* Check marks */}
                  <circle cx="38" cy="39.5" r="2.2" fill="#4A7C59"/>
                  <circle cx="38" cy="47.5" r="2.2" fill="#4A7C59"/>
                  <circle cx="38" cy="55.5" r="2.2" fill="#4A7C59"/>
                  {/* Key */}
                  <g transform="translate(58,62) rotate(20)">
                    <circle cx="8" cy="8" r="8" fill="none" stroke="#F4A01C" strokeWidth="4"/>
                    <rect x="14" y="6" width="20" height="4" fill="#F4A01C"/>
                    <rect x="28" y="10" width="4" height="6" fill="#F4A01C"/>
                    <rect x="34" y="6" width="4" height="8" fill="#F4A01C"/>
                  </g>
                </svg>
              ),
              title: "Skip the Hassle",
              desc: "No towing or setup required. We deliver, level, and do a walkthrough with you to make sure you are comfortable using the camper.",
            },
            {
              accentColor: "#F4A01C", accentBg: "rgba(244,160,28,0.09)",
              svg: (
                <svg width="100" height="100" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="why-bg-2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FDFAF5"/>
                      <stop offset="100%" stopColor="#F3EEE2"/>
                    </linearGradient>
                    <linearGradient id="why-bottle-2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF"/>
                      <stop offset="100%" stopColor="#E3DECF"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="58" fill="url(#why-bg-2)"/>
                  <ellipse cx="58" cy="100" rx="34" ry="5" fill="#000" opacity="0.06"/>
                  {/* Sparkles */}
                  <g fill="#F4A01C">
                    <path d="M30 30 l2 6 6 2 -6 2 -2 6 -2-6 -6-2 6-2z" opacity="0.9"/>
                    <path d="M92 36 l1.6 4.8 4.8 1.6 -4.8 1.6 -1.6 4.8 -1.6-4.8 -4.8-1.6 4.8-1.6z" opacity="0.85"/>
                    <path d="M84 24 l1.2 3.6 3.6 1.2 -3.6 1.2 -1.2 3.6 -1.2-3.6 -3.6-1.2 3.6-1.2z" opacity="0.7"/>
                  </g>
                  {/* Bucket */}
                  <path d="M44 70 h28 l-3 24 a4 4 0 0 1 -4 3.5 H51 a4 4 0 0 1 -4 -3.5 Z" fill="#2D4A2D"/>
                  <path d="M44 70 h28 v4 h-28 Z" fill="#3A5A3A"/>
                  <path d="M48 70 q10 -10 20 0" stroke="#1f3a1f" strokeWidth="2.4" fill="none"/>
                  {/* Towel hanging on bucket */}
                  <path d="M50 74 q-4 8 0 16 q5 -2 6 -16 Z" fill="#A8C98C"/>
                  {/* Brush */}
                  <g transform="translate(28,58) rotate(-18)">
                    <rect x="0" y="0" width="6" height="22" rx="2" fill="#8B5E3C"/>
                    <rect x="-2" y="20" width="10" height="8" rx="1.5" fill="#D8B45A"/>
                    <path d="M-2 28h10l-1 6h-8z" fill="#C7A24A"/>
                  </g>
                  {/* Spray bottle */}
                  <g transform="translate(66,38)">
                    <rect x="0" y="14" width="18" height="28" rx="3" fill="url(#why-bottle-2)" stroke="#C7BFAE" strokeWidth="1"/>
                    <rect x="4" y="4" width="10" height="12" rx="2" fill="#2D4A2D"/>
                    <rect x="2" y="0" width="14" height="6" rx="2" fill="#1f3a1f"/>
                    <path d="M16 2 L26 -4" stroke="#1f3a1f" strokeWidth="2.5" strokeLinecap="round"/>
                    <rect x="3" y="20" width="12" height="3" rx="1.5" fill="#4A7C59" opacity="0.5"/>
                  </g>
                </svg>
              ),
              title: "Cleanliness is Key",
              desc: "Every camper is thoroughly cleaned, sanitized, and inspected before every rental for your peace of mind.",
            },
            {
              accentColor: "#8B5E3C", accentBg: "rgba(139,94,60,0.08)",
              svg: (
                <svg width="100" height="100" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="why-bg-3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8F0E5"/>
                      <stop offset="100%" stopColor="#FDFAF5"/>
                    </linearGradient>
                    <linearGradient id="why-headset-3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3A5A3A"/>
                      <stop offset="100%" stopColor="#1f3a1f"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="58" fill="url(#why-bg-3)"/>
                  <ellipse cx="60" cy="100" rx="32" ry="5" fill="#000" opacity="0.06"/>
                  {/* Headset band */}
                  <path d="M28 58 a32 32 0 0 1 64 0" stroke="url(#why-headset-3)" strokeWidth="6" fill="none" strokeLinecap="round"/>
                  {/* Ear cups */}
                  <rect x="20" y="54" width="14" height="22" rx="7" fill="url(#why-headset-3)"/>
                  <rect x="86" y="54" width="14" height="22" rx="7" fill="url(#why-headset-3)"/>
                  <rect x="23" y="58" width="8" height="14" rx="4" fill="#5A8C6A" opacity="0.5"/>
                  <rect x="89" y="58" width="8" height="14" rx="4" fill="#5A8C6A" opacity="0.5"/>
                  {/* Mic boom */}
                  <path d="M30 70 q-6 10 8 14" stroke="url(#why-headset-3)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                  <circle cx="39" cy="85" r="3.2" fill="#1f3a1f"/>
                  {/* Chat bubble */}
                  <ellipse cx="60" cy="64" rx="22" ry="16" fill="#F4A01C"/>
                  <path d="M50 76 l-4 9 10 -5 Z" fill="#F4A01C"/>
                  <circle cx="51" cy="64" r="2.6" fill="#fff"/>
                  <circle cx="60" cy="64" r="2.6" fill="#fff"/>
                  <circle cx="69" cy="64" r="2.6" fill="#fff"/>
                </svg>
              ),
              title: "Personalized Customer Service",
              desc: "We're here every step of the way — from your first inquiry until your trip ends — to make your rental experience smooth and stress-free.",
            },
            {
              accentColor: "#2D4A2D", accentBg: "rgba(45,74,45,0.08)",
              svg: (
                <svg width="100" height="100" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="why-bg-4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E5EFE0"/>
                      <stop offset="100%" stopColor="#FDFAF5"/>
                    </linearGradient>
                    <linearGradient id="why-shield-4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF"/>
                      <stop offset="100%" stopColor="#F3F0E8"/>
                    </linearGradient>
                    <linearGradient id="why-tree-4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4A7C59"/>
                      <stop offset="100%" stopColor="#2D4A2D"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="58" fill="url(#why-bg-4)"/>
                  <ellipse cx="60" cy="100" rx="34" ry="5" fill="#000" opacity="0.07"/>
                  {/* Trees behind shield */}
                  <g>
                    <path d="M24 90 L31 64 L38 90 Z" fill="url(#why-tree-4)"/>
                    <path d="M20 80 L31 56 L42 80 Z" fill="url(#why-tree-4)"/>
                  </g>
                  <g>
                    <path d="M82 92 L89 66 L96 92 Z" fill="url(#why-tree-4)"/>
                    <path d="M78 82 L89 58 L100 82 Z" fill="url(#why-tree-4)"/>
                  </g>
                  {/* Shield gold outer */}
                  <path d="M60 22 L88 32 V58 c0 22 -13 36 -28 42 -15 -6 -28 -20 -28 -42 V32 Z" fill="#F4A01C"/>
                  {/* Shield inner white/cream */}
                  <path d="M60 28 L82 36 V58 c0 18 -10.5 29.5 -22 34.5 -11.5 -5 -22 -16.5 -22 -34.5 V36 Z" fill="url(#why-shield-4)"/>
                  {/* Checkmark */}
                  <path d="M48 58 l9 9 16 -18" stroke="#2D4A2D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ),
              title: "Safety & Peace of Mind",
              desc: "Commercially insured, safety inspected, and backed by a detailed rental agreement so you can book with confidence.",
            },
          ].map((item, i) => (
            <WhyCard key={item.title} item={item} i={i} visible={whyVisible} />
          ))}
        </div>
      </section>

      {/* ── DIVIDER why → gallery: scalloped wave ── */}
      <div style={{ background: "#FDFAF5", lineHeight: 0, marginTop: "-1px", position: "relative" }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "60px" }}>
          <path
            d="M0,60 
               C120,26 240,26 360,40 
               C480,54 600,54 720,36 
               C840,18 960,18 1080,34 
               C1200,52 1320,52 1440,26 
               L1440,60 L0,60 Z"
            fill="#EDEAE0"
          />
          <path
            d="M0,60 
               C120,26 240,26 360,40 
               C480,54 600,54 720,36 
               C840,18 960,18 1080,34 
               C1200,52 1320,52 1440,26"
            fill="none" stroke="#F4A01C" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── PHOTO GALLERY STRIP ── */}
      <div ref={galleryRef} style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        height: "280px", overflow: "hidden",
        opacity: galleryVisible ? 1 : 0,
        transition: "opacity 0.9s ease",
      }}>
        {[IMAGES.kitchen, IMAGES.welcome, IMAGES.bedroom].map((img, i) => (
          <div key={i} style={{ overflow: "hidden", position: "relative" }}>
            <img src={img} alt="" style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              transform: galleryVisible ? "scale(1)" : "scale(1.06)",
              transition: `transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 120}ms`,
            }}
              onMouseEnter={e => e.target.style.transform = "scale(1.07)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"}
            />
          </div>
        ))}
      </div>

      {/* ── GUEST REVIEWS ── */}
      <ReviewsSection
        reviewsRef={reviewsRef}
        reviewsVisible={reviewsVisible}
        setPage={setPage}
        reviews={REVIEWS.filter(r => !["Mark J.", "Denise J.", "Sarah J.", "Katlin V.", "Jennifer R.", "Tammy R.", "Nathan H."].includes(r.name) && !(r.name === "Candace T." && r.tag === "Moors Campground"))}
      />

      {/* ── DIVIDER reviews → cta: scalloped wave ── */}
      <div style={{ background: "#FDFAF5", lineHeight: 0, marginTop: "-1px", position: "relative" }}>
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "70px" }}>
          <path
            d="M0,70 
               C120,30 240,30 360,48 
               C480,66 600,66 720,42 
               C840,18 960,18 1080,40 
               C1200,62 1320,62 1440,30 
               L1440,70 L0,70 Z"
            fill="#1C1C1C"
          />
          <path
            d="M0,70 
               C120,30 240,30 360,48 
               C480,66 600,66 720,42 
               C840,18 960,18 1080,40 
               C1200,62 1320,62 1440,30"
            fill="none" stroke="#F4A01C" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── CTA ── */}
      <section style={S.cta} ref={ctaRef}>
        <div style={{ ...S.ctaBg, backgroundImage: `url(${IMAGES.cta_campfire})` }} />
        <div style={S.ctaOverlay} />
        <div style={{
          ...S.ctaContent,
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}>
          <div style={{ ...S.sectionEyebrow, color: C.gold, display: "block", marginBottom: "16px" }}>Start Planning Today</div>
          <h2 style={S.ctaH2}>Ready for your<br />next adventure?</h2>
          <p style={S.ctaSub}>Lock in your trip today. Not sure where to go? Use the contact form and we can help!</p>
          <button
            style={{ ...S.btnPrimary, fontSize: "17px", padding: "18px 48px", boxShadow: "0 6px 28px rgba(139,94,60,0.45)" }}
            onClick={() => { trackEvent("check_availability_click", { location: "mid_page_cta" }); setPage("fleet"); window.scrollTo(0,0); }}
            onMouseEnter={e => { e.target.style.background = C.bronzeHover; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 10px 36px rgba(139,94,60,0.55)"; }}
            onMouseLeave={e => { e.target.style.background = C.bronze; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 6px 28px rgba(139,94,60,0.45)"; }}
          >Check Availability</button>
        </div>
      </section>

      <Footer setPage={setPage} />

    </div>
  );
}

// ── FAQ Page ──────────────────────────────────────────────────────────────────
const FAQ_DATA = [
  {
    category: "Booking & Reservations",
    items: [
      { q: "How do I reserve a camper?", a: "Browse our fleet, choose your camper, then complete the booking request form. We'll reach out via email to confirm availability, send your quote, and finalize the details." },
      { q: "How far in advance should I book?", a: "We recommend booking as early as possible — 3 to 6 months out for peak season (summer weekends, holidays, race events, and festivals), since popular dates fill up quickly. Reservations open February 1st annually." },
      { q: "Is a deposit required to reserve my dates?", a: "Yes, a $200 booking deposit — or full payment — is required to hold your dates. The $200 deposit is non-refundable but applies toward your total balance." },
      { q: "What is a refundable security deposit?", a: "There is a $500 refundable security deposit. It is charged the day of check-in and returned when your trip is over and after inspection. See the rental agreement for details." },
      { q: "What payment methods do you accept?", a: "We accept debit cards, credit cards, PayPal, Venmo, and Affirm for flexible financing options." },
      { q: "Can I change or cancel my reservation?", a: "You have 24 hours after booking to cancel for a full refund — no exceptions. After the 24-hour window, you can receive a refund minus the booking deposit. If your booking deposit is not refunded, you can apply it toward a future rental within the same year. Any cancellation from or within 7 days of your reservation will not receive any refund." },
    ],
  },
  {
    category: "Delivery & Setup",
    items: [
      { q: "Do you deliver the camper to my location?", a: "Yes! We deliver, level, and fully set up your camper at your campsite or location. We proudly serve Kentucky, Indiana, and Tennessee." },
      { q: "Will someone walk me through the camper?", a: "Absolutely. We ask that you be present at delivery for a complete walkthrough so you feel comfortable using every feature of the camper." },
      { q: "What do I need to bring?", a: "Just your food, clothes, and toiletries. We take care of everything else — linens, kitchen essentials, and all the comforts of home are included." },
    ],
  },
  {
    category: "The Campers",
    items: [
      { q: "What is included with the rental?", a: "Each camper comes fully equipped with sleeping and living essentials, kitchen essentials, outdoor essentials, and complimentary starter items. Specific inclusions are listed on each camper's detail page." },
      { q: "Are the campers pet friendly?", a: "Yes! A signed pet policy must be on file. We limit it to 2 pets." },
      { q: "How many people can stay in the camper?", a: "Our Cedar Creek Silverback sleeps up to 6 guests and our Aspen Trail sleeps up to 6. Please don't exceed the listed capacity for safety and comfort." },
      { q: "Are the campers cleaned between rentals?", a: "Yes — every camper is thoroughly cleaned, sanitized, and inspected before every rental. Cleanliness is one of our top priorities." },
    ],
  },
  {
    category: "Events & Special Occasions",
    items: [
      { q: "Can I rent a camper for a race weekend or music festival?", a: "Absolutely — events are one of our most popular use cases! We're experienced with race weekends, festivals, family reunions, and more. Approval is case by case for these locations — just ask! Book early as event weekends sell out fast." },
      { q: "Do you offer multi-camper rentals for large groups?", a: "Contact us to discuss your group's needs. We'll do our best to accommodate larger parties." },
      { q: "Can I use the camper as extra guest accommodation at my property?", a: "Yes! Many customers use our campers as overflow guest accommodation for family gatherings and special events. Approval also depends on location and space." },
    ],
  },
];

function FaqAccordion({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: "14px",
      border: `1px solid ${open ? "rgba(74,124,89,0.25)" : "rgba(0,0,0,0.07)"}`,
      background: open ? "rgba(74,124,89,0.03)" : "#fff",
      overflow: "hidden",
      transition: "border-color 0.3s, background 0.3s",
      marginBottom: "10px",
      boxShadow: open ? "0 4px 20px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", textAlign: "left", gap: "16px",
        }}
      >
        <span style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700, fontSize: "17px",
          color: open ? "#2D4A2D" : "#1C1C1C",
          lineHeight: 1.3, flex: 1,
          transition: "color 0.2s",
        }}>{item.q}</span>
        <span style={{
          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
          background: open ? "#2D4A2D" : "rgba(45,74,45,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.3s, transform 0.3s",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke={open ? "#fff" : "#2D4A2D"} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </span>
      </button>
      <div style={{
        maxHeight: open ? "300px" : "0",
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          color: "#6B7B6B", fontSize: "15px", lineHeight: 1.75,
          margin: 0, padding: "0 24px 22px",
        }}>{item.a}</p>
      </div>
    </div>
  );
}

function FAQPage({ setPage }) {
  const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.01 });

  return (
    <div style={{ background: "#FDFAF5", minHeight: "100vh" }}>
      <Nav page="faq" setPage={setPage} />

      {/* Page header */}
      <div style={{
        background: "linear-gradient(135deg, #2D4A2D 0%, #1a2e1a 100%)",
        padding: "140px clamp(24px,6vw,80px) 80px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }} ref={heroRef}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 40%, rgba(244,160,28,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{
          position: "relative", zIndex: 1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#F4A01C", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "18px" }}>
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
            We're Here To Help
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", fontSize: "clamp(36px,5vw,62px)", lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.75)", fontSize: "18px", lineHeight: 1.65, maxWidth: "520px", margin: "0 auto" }}>
            Everything you need to know before booking. Don't see your question? Reach out — we're happy to help.
          </p>
        </div>
        {/* Wave bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "56px" }}>
            <path d="M0,56 C360,0 1080,56 1440,0 L1440,56 L0,56 Z" fill="#FDFAF5" />
          </svg>
        </div>
      </div>

      {/* FAQ categories */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px clamp(24px,6vw,40px) 100px" }}>
        {FAQ_DATA.map((cat, ci) => (
          <FaqSection key={cat.category} cat={cat} delay={ci * 80} />
        ))}

        {/* Quick reviews */}
        <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          <div style={{
            background: "#fff", borderRadius: "20px",
            padding: "28px 32px", textAlign: "center",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid rgba(45,74,45,0.08)",
          }}>
            <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="15" height="15" viewBox="0 0 20 20" fill="#F4A01C">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                </svg>
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#4a4a4a", fontSize: "15px", lineHeight: 1.7, fontStyle: "italic", marginBottom: "14px" }}>
              "Amazing people and amazing camper! Highly recommend."
            </p>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "14px" }}>Jennifer R.</div>
            <div style={{ fontFamily: "'Inter', sans-serif", color: "#4A7C59", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Verified Guest</div>
          </div>

          <div style={{
            background: "#fff", borderRadius: "20px",
            padding: "28px 32px", textAlign: "center",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid rgba(45,74,45,0.08)",
          }}>
            <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="15" height="15" viewBox="0 0 20 20" fill="#F4A01C">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                </svg>
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#4a4a4a", fontSize: "15px", lineHeight: 1.7, fontStyle: "italic", marginBottom: "14px" }}>
              "They are awesome at getting delivered and set up for you to enjoy your time! Prices are great as well!"
            </p>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "14px" }}>Tammy R.</div>
            <div style={{ fontFamily: "'Inter', sans-serif", color: "#4A7C59", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Verified Guest</div>
          </div>

          <div style={{
            background: "#fff", borderRadius: "20px",
            padding: "28px 32px", textAlign: "center",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid rgba(45,74,45,0.08)",
          }}>
            <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="15" height="15" viewBox="0 0 20 20" fill="#F4A01C">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                </svg>
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#4a4a4a", fontSize: "15px", lineHeight: 1.7, fontStyle: "italic", marginBottom: "14px" }}>
              "Excellent people to deal with, great service and always on time."
            </p>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "14px" }}>Nathan H.</div>
            <div style={{ fontFamily: "'Inter', sans-serif", color: "#4A7C59", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Verified Guest</div>
          </div>
        </div>

        {/* Still have questions CTA */}
        <div style={{
          marginTop: "60px", background: "#fff", borderRadius: "24px",
          padding: "48px 40px", textAlign: "center",
          boxShadow: "0 4px 28px rgba(0,0,0,0.07)", border: "1px solid rgba(45,74,45,0.08)",
        }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>💬</div>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "24px", marginBottom: "10px" }}>Still have questions?</h3>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "15px", lineHeight: 1.7, marginBottom: "24px", maxWidth: "380px", margin: "0 auto 24px" }}>
            We'd love to hear from you. Reach out and we'll get back to you as soon as possible.
          </p>
          <button
            onClick={() => { setPage("contact"); window.scrollTo(0,0); }}
            style={{ background: "#2D4A2D", color: "#fff", border: "none", borderRadius: "50px", padding: "14px 36px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px", cursor: "pointer", letterSpacing: "0.04em", transition: "background 0.2s, transform 0.2s", boxShadow: "0 4px 16px rgba(45,74,45,0.28)" }}
            onMouseEnter={e => { e.target.style.background = "#4A7C59"; e.target.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.target.style.background = "#2D4A2D"; e.target.style.transform = "translateY(0)"; }}
          >Contact Us</button>
        </div>
      </div>

      <Footer setPage={setPage} />
    </div>
  );
}

function FaqSection({ cat, delay }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} style={{
      marginBottom: "48px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(45,74,45,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#2D4A2D" }} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#2D4A2D", fontSize: "22px", margin: 0 }}>{cat.category}</h2>
      </div>
      {cat.items.map(item => <FaqAccordion key={item.q} item={item} />)}
    </div>
  );
}

// ── Contact Page ──────────────────────────────────────────────────────────────
function ContactPage({ setPage }) {
  const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.01 });
  const [formRef, formVisible] = useScrollReveal();
  const [infoRef, infoVisible] = useScrollReveal();

  const [form, setForm] = useState({ name: "", email: "", phone: "", event: "", dates: "", camper: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const encode = (data) => Object.keys(data).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(data[k])).join("&");
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode({ "form-name": "contact", ...form }),
      });
    } catch (err) {
      // Netlify Forms requires static deployment to function; this fails gracefully in preview
      console.warn("Form submission requires Netlify deployment:", err);
    }
    setSubmitted(true);
  };

  const inputStyle = (field) => ({
    width: "100%", boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif", fontSize: "15px",
    padding: "14px 16px", borderRadius: "12px",
    border: focusedField === field ? "1.5px solid #4A7C59" : "1.5px solid rgba(0,0,0,0.12)",
    background: focusedField === field ? "rgba(74,124,89,0.03)" : "#fff",
    outline: "none", color: "#1C1C1C",
    transition: "border-color 0.25s, background 0.25s",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(74,124,89,0.1)" : "none",
  });

  const labelStyle = { fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "13px", color: "#1C1C1C", letterSpacing: "0.04em", marginBottom: "6px", display: "block" };

  return (
    <div style={{ background: "#FDFAF5", minHeight: "100vh" }}>
      <Nav page="contact" setPage={setPage} />

      {/* Page header */}
      <div style={{
        background: "linear-gradient(135deg, #2D4A2D 0%, #1a2e1a 100%)",
        padding: "140px clamp(24px,6vw,80px) 80px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }} ref={heroRef}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 50%, rgba(244,160,28,0.11) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{
          position: "relative", zIndex: 1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#F4A01C", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "18px" }}>
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
            We'd Love To Hear From You
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", fontSize: "clamp(36px,5vw,62px)", lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Get In Touch
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.75)", fontSize: "18px", lineHeight: 1.65, maxWidth: "500px", margin: "0 auto" }}>
            Ready to book or just have a question? Fill out the form below or reach out directly — we'll get back to you quickly.
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "56px" }}>
            <path d="M0,56 C360,0 1080,56 1440,0 L1440,56 L0,56 Z" fill="#FDFAF5" />
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div className="wkcr-contact-grid" style={{ maxWidth: "1100px", margin: "0 auto", padding: "60px clamp(24px,6vw,40px) 100px", display: "grid", gridTemplateColumns: "1fr 380px", gap: "48px", alignItems: "start" }}>

        {/* Contact Form */}
        <div ref={formRef} style={{
          opacity: formVisible ? 1 : 0,
          transform: formVisible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "30px", marginBottom: "8px" }}>Send Us A Message</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "15px", lineHeight: 1.65, marginBottom: "32px" }}>
            Fill out the form below and we'll respond within 24 hours.
          </p>

          {submitted ? (
            <div style={{ background: "#fff", borderRadius: "20px", padding: "56px 40px", textAlign: "center", boxShadow: "0 4px 28px rgba(0,0,0,0.07)", border: "1px solid rgba(74,124,89,0.15)" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>🎉</div>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#2D4A2D", fontSize: "26px", marginBottom: "12px" }}>Message Sent!</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "15px", lineHeight: 1.7 }}>
                Thanks for reaching out! We'll be in touch within 24 hours to help plan your adventure.
              </p>
            </div>
          ) : (
            <form
              name="contact"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
              style={{ background: "#fff", borderRadius: "20px", padding: "40px", boxShadow: "0 4px 28px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              {/* Hidden fields required for Netlify static form detection */}
              <input type="hidden" name="form-name" value="contact" />
              <p style={{ display: "none" }}><label>Don't fill this out: <input name="bot-field" /></label></p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Jane Smith"
                    style={inputStyle("name")}
                    onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="your@email.com"
                    style={inputStyle("email")}
                    onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="(270) 820-8685"
                    style={inputStyle("phone")}
                    onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} />
                </div>
                <div>
                  <label style={labelStyle}>Camper of Interest</label>
                  <select name="camper" value={form.camper} onChange={handleChange}
                    style={{ ...inputStyle("camper"), appearance: "none", cursor: "pointer" }}
                    onFocus={() => setFocusedField("camper")} onBlur={() => setFocusedField(null)}>
                    <option value="">Select a camper…</option>
                    <option>Cedar Creek Silverback (Sleeps 8)</option>
                    <option>Aspen Trail (Sleeps 6)</option>
                    <option>Not sure yet</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Event / Occasion</label>
                <input name="event" value={form.event} onChange={handleChange} placeholder="e.g. Family vacation, race weekend, festival…"
                  style={inputStyle("event")}
                  onFocus={() => setFocusedField("event")} onBlur={() => setFocusedField(null)} />
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Desired Dates</label>
                <input name="dates" value={form.dates} onChange={handleChange} placeholder="e.g. July 4–7, 2025"
                  style={inputStyle("dates")}
                  onFocus={() => setFocusedField("dates")} onBlur={() => setFocusedField(null)} />
              </div>
              <div style={{ marginBottom: "28px" }}>
                <label style={labelStyle}>Message</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Tell us about your trip, ask us anything…"
                  style={{ ...inputStyle("message"), resize: "vertical", minHeight: "120px" }}
                  onFocus={() => setFocusedField("message")} onBlur={() => setFocusedField(null)} />
              </div>
              <button type="submit" style={{
                width: "100%", background: "#8B5E3C", color: "#fff", border: "none", borderRadius: "50px",
                padding: "16px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px",
                cursor: "pointer", letterSpacing: "0.04em",
                boxShadow: "0 4px 20px rgba(139,94,60,0.35)",
                transition: "background 0.25s, transform 0.2s, box-shadow 0.25s",
              }}
                onMouseEnter={e => { e.target.style.background = "#6E4A2D"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(139,94,60,0.45)"; }}
                onMouseLeave={e => { e.target.style.background = "#8B5E3C"; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(139,94,60,0.35)"; }}
              >Send Message</button>
            </form>
          )}
        </div>

        {/* Contact Info sidebar */}
        <div ref={infoRef} style={{
          opacity: infoVisible ? 1 : 0,
          transform: infoVisible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          display: "flex", flexDirection: "column", gap: "20px",
        }}>
          {/* Info card */}
          <div style={{ background: "#2D4A2D", borderRadius: "20px", padding: "36px 28px", color: "#fff" }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "22px", marginBottom: "24px", color: "#fff" }}>Contact Information</h3>
            {[
              { icon: "📞", label: "Phone", value: "(270) 820-8685", sub: "Call or text anytime", href: "tel:+12708208685", trackName: "phone_click" },
              { icon: "📧", label: "Email", value: "Emily.rust@westernkycamperrentals.com", sub: "We reply within 24 hours", href: "mailto:Emily.rust@westernkycamperrentals.com", trackName: "email_click" },
              { icon: "📍", label: "Service Area", value: "Based out of Central City, KY", sub: "Serving Kentucky · Indiana · Tennessee" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", gap: "16px", marginBottom: "22px" }}>
                <div style={{
                  width: "46px", height: "46px", borderRadius: "12px",
                  background: "#F4A01C",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 4px 12px rgba(244,160,28,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", flexShrink: 0,
                }}>{item.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#F4A01C", marginBottom: "3px" }}>{item.label}</div>
                  {item.href ? (
                    <a
                      href={item.href}
                      onClick={() => trackEvent(item.trackName, { location: "contact_sidebar" })}
                      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px", color: "#fff", marginBottom: "2px", textDecoration: "none", display: "inline-block" }}
                    >{item.value}</a>
                  ) : (
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px", color: "#fff", marginBottom: "2px" }}>{item.value}</div>
                  )}
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{item.sub}</div>
                </div>
              </div>
            ))}
            {/* Social links */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "20px", marginTop: "4px" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#F4A01C", marginBottom: "14px" }}>Follow Us</div>
              <div style={{ display: "flex", gap: "12px" }}>
                {[
                  {
                    label: "Facebook",
                    url: "https://www.facebook.com/profile.php?id=61576844773063",
                    svg: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94z"/>
                      </svg>
                    ),
                  },
                  {
                    label: "Instagram",
                    url: "https://www.instagram.com/westernkycamperrentalsllc",
                    svg: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="#fff" strokeWidth="1.8"/>
                        <circle cx="12" cy="12" r="4.3" stroke="#fff" strokeWidth="1.8"/>
                        <circle cx="17.6" cy="6.4" r="1.15" fill="#fff"/>
                      </svg>
                    ),
                  },
                  {
                    label: "TikTok",
                    url: "https://www.tiktok.com/@westernkycamperrentals",
                    svg: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                        <path d="M16.6 2h-3.2v13.6a2.8 2.8 0 1 1-2.4-2.77V9.6a6 6 0 1 0 5.6 5.98V8.4a6.9 6.9 0 0 0 4.4 1.58V6.78A3.7 3.7 0 0 1 16.6 2z"/>
                      </svg>
                    ),
                  },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.url || "#"}
                    target={s.url ? "_blank" : undefined}
                    rel={s.url ? "noopener noreferrer" : undefined}
                    aria-label={s.label}
                    title={s.label}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "44px", height: "44px",
                      background: "rgba(255,255,255,0.10)",
                      border: "1.5px solid rgba(255,255,255,0.18)",
                      borderRadius: "50%",
                      transition: "background 0.2s, transform 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#F4A01C"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#F4A01C"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                  >{s.svg}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Quick review card */}
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "26px 24px",
            border: "1px solid rgba(45,74,45,0.08)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#F4A01C">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                </svg>
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#4a4a4a", fontSize: "14px", lineHeight: 1.7, fontStyle: "italic", marginBottom: "14px" }}>
              "Great customer service. Very nice accommodations. Everything was set up and ready when we arrived."
            </p>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "14px" }}>Mark J.</div>
            <div style={{ fontFamily: "'Inter', sans-serif", color: "#4A7C59", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Verified Guest</div>
          </div>

        </div>
      </div>

      <Footer setPage={setPage} />
    </div>
  );
}

// ── Fleet Page ────────────────────────────────────────────────────────────────
const FLEET_DATA = [
  {
    id: "cedar-creek",
    detailPagePills: [
      { icon: "📏", label: "36 ft" },
      { icon: "🔌", label: "50 Amp" },
    ],
    detailPagePillsEnd: [
      { icon: "📻", label: "Radio" },
      { icon: "📀", label: "DVD/Movies" },
    ],
    floorplanImg: IMAGES.cc_floorplan,
    badge: "Fifth Wheel · Premium",
    name: "Cedar Creek Silverback",
    tagline: "Our 36ft luxury fifth wheel — the ultimate home away from home.",
    sleeps: "4–6",
    length: "36 ft",
    type: "Fifth Wheel",
    heroImg: IMAGES.cc_ext_day,
    galleryImgs: [IMAGES.cc_ext_day, IMAGES.cc_ext_day2, IMAGES.cc_ext_day3, IMAGES.cc_site1, IMAGES.cc_ext_night, IMAGES.cc_site2, IMAGES.cc_night3, IMAGES.cc_living, IMAGES.cc_recliners, IMAGES.cc_living_area, IMAGES.cc_fireplace, IMAGES.cc_kitchen, IMAGES.cc_welcome, IMAGES.cc_bedroom, IMAGES.cc_bed2, IMAGES.cc_beds, IMAGES.cc_bathroom, IMAGES.cc_bath2, IMAGES.cc_truck, IMAGES.cc_floorplan],
    description: "The Cedar Creek Silverback offers the comfort and space of home while you're away. Featuring a residential kitchen with an island, a cozy gas fireplace, comfortable recliners, and a private king master. This fifth wheel provides everything you need for a relaxing and enjoyable stay. With plenty of room to unwind, it's a great choice for family vacations.",
    amenities: [
      { icon: "🛏️", label: "King Bedroom" },
      { icon: "🛏️", label: "Queen Sofa Bed" },
      { icon: "🛏️", label: "Twin Air Mattress" },
      { icon: "🍳", label: "Full Kitchen" },
      { icon: "🔥", label: "Gas Fireplace" },
      { icon: "📺", label: "2 Flat Screen TVs" },
      { icon: "🚿", label: "Full Size Shower" },
      { icon: "❄️", label: "AC & Heat" },
      { icon: "🛋️", label: "Comfy Recliners" },
      { icon: "🪑", label: "Spacious Living" },
      { icon: "🪟", label: "Large Windows" },
      { icon: "💡", label: "LED Lighting" },
    ],
    pricing: [
      { label: "Nightly Rate", value: "$125 / night" },
      { label: "Prep Fee", value: "$100 (one-time)" },
      { label: "Delivery Fee", value: "$200 minimum or $5 per mile from Central City, KY 42330" },
    ],
    note: "Minimum stay is 3 nights. 6% sales tax and 3% payment processing fee will be applied. See below for pricing details.",
    quickInfo: [
      { icon: "👥", label: "Sleeps 4–6" },
      { icon: "🛏️", label: "King Bedroom" },
      { icon: "🚿", label: "2 Bathrooms" },
      { icon: "📏", label: "36 Feet" },
      { icon: "🚚", label: "Delivery & Setup Included" },
      { icon: "🐾", label: "Pet Friendly (Upon Approval)" },
    ],
    included: [
      "Full delivery, leveling, and setup at your site",
      "Walkthrough orientation so you know how everything works",
      "Fresh linens on the king bed and sofa sleeper",
      "Welcome basket with local treats and essentials",
      "Full propane fill and fresh water hookup",
      "Pickup and teardown at the end of your stay",
    ],
    policies: [
      "3-night minimum stay required.",
      "Drop off is 6pm. Pickup is 11am. We are flexible if our schedule allows.",
      "A $200 non-refundable deposit is required to confirm your reservation. This deposit applies toward your total balance. You also have the option to pay in full at booking. Your full balance is due 7 days before your departure date.",
      "A $500 refundable security deposit will be charged to the card on file in your rental agreement. All reservations must sign a rental agreement at booking.",
      "Furry friends are welcome with prior approval and signed pet policy.",
      "Smoking is not permitted inside the camper.",
      "Guests are responsible for any damage beyond normal wear and tear. See rental agreement for details.",
    ],
    faq: [
      { q: "Do you deliver outside Central City?", a: "Yes — we deliver throughout Kentucky, Indiana, and Tennessee. We typically stay within 100 miles, but we're open to going beyond that if our schedule allows. Just ask! Delivery is $5/mile from our home base in Central City, KY (42330)." },
      { q: "What's included in the prep fee?", a: "The $100 prep fee covers cleaning, sanitizing, and fully preparing the camper before every rental." },
    ],
  },
  {
    id: "aspen-trail",
    detailPagePillsEnd: [
      { icon: "📻", label: "Radio" },
    ],
    badge: "Travel Trailer · Family",
    name: "Aspen Trail",
    tagline: "Spacious, modern, and perfect for families or any events.",
    sleeps: 6,
    length: "34 ft",
    type: "Travel Trailer",
    heroImg: IMAGES.at_ext1,
    galleryImgs: [IMAGES.at_ext1, IMAGES.at_ext2, IMAGES.at_living, IMAGES.at_kitchen, IMAGES.at_master, IMAGES.at_exitdoor, IMAGES.at_bathsink, IMAGES.at_bathshower, IMAGES.at_bathvanity],
    description: "The Aspen Trail is our family-friendly travel trailer — built for comfort, versatility, and fun. With bunk beds, a full bath, dinette seating, and a smart open layout, it's the ideal choice for families with kids, camping groups, and festival-goers. Sleek modern exterior with all the essentials packed in for a stress-free stay.",
    amenities: [
      { icon: "📏", label: "34 ft" },
      { icon: "🔌", label: "50 Amp" },
      { icon: "🛏️", label: "Private Queen Master Suite" },
      { icon: "🪑", label: "Convertible Dinette" },
      { icon: "🛋️", label: "Convertible Couch" },
      { icon: "🚿", label: "2 Bathrooms" },
      { icon: "🛏️", label: "Bunk Beds" },
      { icon: "🍳", label: "Full Kitchen" },
      { icon: "📺", label: "Flat Screen TV" },
      { icon: "❄️", label: "AC & Heat" },
      { icon: "🔌", label: "USB Charging Ports" },
    ],
    pricing: [
      { label: "Nightly Rate", value: "$125 / night" },
      { label: "Prep Fee", value: "$100 (one-time)" },
      { label: "Delivery Fee", value: "$200 minimum or $5 per mile from Central City, KY 42330" },
    ],
    note: "Minimum stay is 3 nights. 6% sales tax and 3% payment processing fee will be applied. See below for pricing details.",
    quickInfo: [
      { icon: "👥", label: "Sleeps 6" },
      { icon: "🛏️", label: "Queen + Bunk Beds" },
      { icon: "🚿", label: "2 Bathrooms" },
      { icon: "📏", label: "34 Feet" },
      { icon: "🚚", label: "Delivery & Setup Included" },
      { icon: "🐾", label: "Pet Friendly (Upon Approval)" },
    ],
    included: [
      "Full delivery, leveling, and setup at your site",
      "Walkthrough orientation so you know how everything works",
      "Fresh linens on the queen bed and sofa sleeper",
      "Welcome basket with local treats and essentials",
      "Full propane fill and fresh water hookup",
      "Pickup and teardown at the end of your stay",
    ],
    policies: [
      "3-night minimum stay required.",
      "Drop off is 6pm. Pickup is 11am. We are flexible if our schedule allows.",
      "A $200 non-refundable deposit is required to confirm your reservation. This deposit applies toward your total balance. You also have the option to pay in full at booking. Your full balance is due 7 days before your departure date.",
      "A $500 refundable security deposit will be charged to the card on file in your rental agreement. All reservations must sign a rental agreement at booking.",
      "Furry friends are welcome with prior approval and signed pet policy.",
      "Smoking is not permitted inside the camper.",
      "Guests are responsible for any damage beyond normal wear and tear. See rental agreement for details.",
    ],
    faq: [
      { q: "Do you deliver outside Central City?", a: "Yes — we deliver throughout Kentucky, Indiana, and Tennessee. We typically stay within 100 miles, but we're open to going beyond that if our schedule allows. Just ask! Delivery is $5/mile from our home base in Central City, KY (42330)." },
      { q: "What's included in the prep fee?", a: "The $100 prep fee covers cleaning, sanitizing, and fully preparing the camper before every rental." },
    ],
  },
];

// ── Availability Calendar ────────────────────────────────────────────────────
function AvailabilityCalendar({ onRequestDates, bookedRanges: bookedRangesOverride = [], camperId = "default" }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const storageKey = `wkcr-dates-${camperId}`;

  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { arrival: null, departure: null };
      const parsed = JSON.parse(raw);
      return {
        arrival: parsed.arrival ? new Date(parsed.arrival) : null,
        departure: parsed.departure ? new Date(parsed.departure) : null,
      };
    } catch { return { arrival: null, departure: null }; }
  };
  const saved = loadSaved();

  const [monthOffset, setMonthOffset] = useState(0);
  const [slideDir, setSlideDir] = useState("next");
  const [arrival, setArrival] = useState(saved.arrival);
  const [departure, setDeparture] = useState(saved.departure);
  const [hoverDate, setHoverDate] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { key, type: 'booked' | 'turnaround' }
  const tooltipTimer = useRef(null);

  // ── Live availability via Netlify serverless function ──────────────────
  // The function reads each camper's public Google Calendar .ics feed
  // server-side (avoiding the browser CORS restriction Google imposes on
  // its .ics feeds) and returns booked date ranges as JSON. No API key
  // needed — bookings show up automatically with no code edits or redeploys.
  const [liveBookedRanges, setLiveBookedRanges] = useState([]);
  // 'loading' | 'ready' | 'error'
  const [calendarStatus, setCalendarStatus] = useState("loading");
  const calendarFetchWorked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setCalendarStatus("loading");

    fetch(`/.netlify/functions/availability?camper=${encodeURIComponent(camperId)}`)
      .then(res => { if (!res.ok) throw new Error("Availability request failed (" + res.status + ")"); return res.json(); })
      .then(data => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setLiveBookedRanges(data.ranges || []);
        setCalendarStatus("ready");
        calendarFetchWorked.current = true;
      })
      .catch(err => {
        if (cancelled) return;
        console.error("Live availability fetch failed:", err);
        setCalendarStatus("error");
      });

    return () => { cancelled = true; };
  }, [camperId]);

  // Live calendar data wins once it has successfully loaded at least once;
  // the bookedRanges prop remains available as a manual fallback/testing
  // override before that (or if the live fetch never succeeds).
  const bookedRanges = calendarFetchWorked.current ? liveBookedRanges : bookedRangesOverride;

  // Persist selections so guests don't lose them if they close the form or navigate back
  useEffect(() => {
    try {
      if (arrival || departure) {
        localStorage.setItem(storageKey, JSON.stringify({
          arrival: arrival ? arrival.toISOString() : null,
          departure: departure ? departure.toISOString() : null,
        }));
      }
    } catch {}
  }, [arrival, departure, storageKey]);

  useEffect(() => () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }, []);

  const showTooltip = (key, type) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip({ key, type });
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2400);
  };

  // Parse "YYYY-MM-DD" as a local-midnight Date (avoids UTC off-by-one-day issues)
  const parseDateOnly = (str) => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isPast = (d) => d < today;

  const parsedRanges = useMemo(
    () => bookedRanges.map(r => ({ start: parseDateOnly(r.start), end: parseDateOnly(r.end) })),
    [bookedRanges]
  );

  // A "night" is booked if it falls within [start, end) of any range — the end date
  // itself is checkout morning, not a booked night, so it's free for a new check-in.
  const isBookedNight = (d) => parsedRanges.some(r => d >= r.start && d < r.end);
  // Checkout day of any existing booking (may also be a new booked night if another
  // range starts that same day — isBookedNight already correctly wins that case).
  const isCheckoutDay = (d) => parsedRanges.some(r => fmt(d) === fmt(r.end));

  // Single month in view at a time
  const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const goToMonth = (dir) => {
    setSlideDir(dir);
    setMonthOffset(m => dir === "prev" ? Math.max(0, m - 1) : m + 1);
  };

  const nights = arrival && departure ? Math.round((departure - arrival) / 86400000) : 0;
  const minNightsMet = nights >= 3;

  // True if any night in the candidate stay [start, end) overlaps an existing booking
  const hasNightConflict = (start, end) => {
    let cursor = new Date(start);
    while (cursor < end) {
      if (isBookedNight(cursor)) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  };

  // While a check-in is selected and check-out hasn't been chosen yet, any candidate
  // check-out date under the 3-night minimum is not selectable.
  const isBelowMinStay = (d) => {
    if (!arrival || departure) return false;
    if (d <= arrival) return false;
    const candidateNights = Math.round((d - arrival) / 86400000);
    return candidateNights < 3;
  };

  const handleDayClick = (d) => {
    if (isPast(d)) return;
    const key = fmt(d);
    const booked = isBookedNight(d);
    const turnaround = !booked && isCheckoutDay(d);

    if (booked) { showTooltip(key, "booked"); return; }
    if (isBelowMinStay(d)) return;
    if (turnaround) showTooltip(key, "turnaround");

    if (!arrival || (arrival && departure)) {
      setArrival(d); setDeparture(null);
    } else if (d <= arrival) {
      setArrival(d); setDeparture(null);
    } else {
      if (hasNightConflict(arrival, d)) { setArrival(d); setDeparture(null); return; }
      setDeparture(d);
    }
  };

  const inRange = (d) => {
    if (!arrival) return false;
    const end = departure || hoverDate;
    if (!end) return false;
    return d > arrival && d < end || d < arrival && d > end;
  };
  const isRangeEnd = (d) => (arrival && fmt(d) === fmt(arrival)) || (departure && fmt(d) === fmt(departure));

  const monthLabel = (m) => m.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const DOW = ["S","M","T","W","T","F","S"];

  const AVAILABLE_TINT = "rgba(74,124,89,0.09)";
  const BOOKED_TINT = "rgba(192,57,43,0.55)";
  const BOOKED_TEXT = "#7A241C";
  const WITHIN_TINT = "rgba(74,124,89,0.22)";
  const TURNAROUND_SPLIT = "linear-gradient(135deg, rgba(192,57,43,0.55) 50%, rgba(74,124,89,0.38) 50%)";

  const renderMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div style={{ maxWidth: "380px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
          {DOW.map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#9B9B9B", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div
          key={monthOffset}
          style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px",
            animation: `${slideDir === "next" ? "wkcrCalSlideRight" : "wkcrCalSlideLeft"} 0.28s ease`,
          }}
        >
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = fmt(d);
            const past = isPast(d);
            const bookedNight = isBookedNight(d);
            const checkout = isCheckoutDay(d);
            const turnaround = checkout && !bookedNight;
            const belowMin = isBelowMinStay(d);
            const selected = isRangeEnd(d);
            const within = inRange(d);
            const nativeDisabled = past || belowMin; // booked dates stay clickable so a tap can show a tooltip
            const softDisabled = bookedNight; // visually + functionally blocked, but tappable for the tooltip

            let background = AVAILABLE_TINT;
            let backgroundImage = "none";
            let color = "#1C1C1C";
            let textDecoration = "none";
            let opacity = 1;

            if (past) {
              background = "transparent";
              color = "#D4D4D4";
            } else if (selected) {
              background = "#2D4A2D";
              color = "#fff";
            } else if (within) {
              background = WITHIN_TINT;
              color = "#1C1C1C";
            } else if (bookedNight) {
              background = BOOKED_TINT;
              color = BOOKED_TEXT;
              textDecoration = "line-through";
              opacity = 0.88;
            } else if (turnaround) {
              background = "transparent";
              backgroundImage = TURNAROUND_SPLIT;
              color = "#1C1C1C";
            } else if (belowMin) {
              background = "transparent";
              color = "#CBCBCB";
            }

            const showBubble = tooltip && tooltip.key === key;

            return (
              <div key={i} style={{ position: "relative" }}>
                <button
                  disabled={nativeDisabled}
                  onClick={() => handleDayClick(d)}
                  onMouseEnter={() => setHoverDate(d)}
                  title={turnaround ? "Check-out day — also available as a new check-in" : bookedNight ? "Booked — not available" : undefined}
                  style={{
                    width: "100%", aspectRatio: "1", border: "none", borderRadius: selected ? "10px" : within ? "0" : "10px",
                    fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: selected ? 700 : 500,
                    cursor: (nativeDisabled || softDisabled) ? "not-allowed" : "pointer",
                    background, backgroundImage, color, textDecoration, opacity,
                    transform: selected ? "scale(1.06)" : "scale(1)",
                    boxShadow: selected ? "0 4px 12px rgba(45,74,45,0.35)" : "none",
                    transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1), background 0.2s ease, box-shadow 0.2s ease, filter 0.15s",
                  }}
                  onMouseOver={e => { if (!nativeDisabled && !softDisabled && !selected && !within) e.currentTarget.style.filter = "brightness(0.94)"; }}
                  onMouseOut={e => { e.currentTarget.style.filter = "none"; }}
                >{d.getDate()}</button>

                {showBubble && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    background: "#1C1C1C", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 500,
                    padding: "7px 11px", borderRadius: "8px", whiteSpace: "nowrap", zIndex: 20,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.25)", animation: "wkcrTooltipIn 0.16s ease",
                    pointerEvents: "none",
                  }}>
                    {tooltip.type === "booked" ? "Booked — not available" : "Check-out day — also available as check-in"}
                    <div style={{
                      position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                      borderTop: "5px solid #1C1C1C",
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <span style={{ width: "19px", height: "19px", borderRadius: "5px", background: "rgba(74,124,89,0.4)", border: "1px solid rgba(74,124,89,0.55)", display: "inline-block" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6B7B6B" }}>Available</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <span style={{ width: "19px", height: "19px", borderRadius: "5px", background: BOOKED_TINT, border: "1px solid rgba(192,57,43,0.7)", display: "inline-block" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6B7B6B" }}>Booked</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <span style={{ width: "19px", height: "19px", borderRadius: "5px", backgroundImage: TURNAROUND_SPLIT, border: "1px solid rgba(0,0,0,0.12)", display: "inline-block" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6B7B6B" }}>Same-Day Turnaround</span>
          </div>
        </div>
      </div>
    );
  };

  const dateStr = (d) => d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div style={{
      background: "#fff", borderRadius: "24px", padding: "32px",
      boxShadow: "0 4px 28px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)",
    }}>
      <style>{`
        @keyframes wkcrCalSlideRight { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes wkcrCalSlideLeft { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes wkcrTooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "24px", marginBottom: "4px" }}>Check Availability</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#6B7B6B" }}>Select your check-in and check-out dates.</div>
      </div>

      {/* Notice */}
      <div style={{
        background: "rgba(244,160,28,0.1)", border: "1px solid rgba(244,160,28,0.3)",
        borderRadius: "14px", padding: "14px 18px", marginBottom: "22px",
      }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "13px", color: "#8B5E3C", marginBottom: "4px" }}>3 Night Minimum Stay</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6B7B6B", lineHeight: 1.5 }}>Please select an arrival date and choose a departure date at least 3 nights later.</div>
      </div>

      {/* Month nav — centered month title like "July 2026" */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <button onClick={() => goToMonth("prev")} disabled={monthOffset === 0} aria-label="Previous month" style={{
          width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(45,74,45,0.15)",
          background: "#fff", cursor: monthOffset === 0 ? "not-allowed" : "pointer", opacity: monthOffset === 0 ? 0.3 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "transform 0.15s",
        }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="#2D4A2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "19px", textAlign: "center" }}>
          {monthLabel(currentMonth)}
        </span>
        <button onClick={() => goToMonth("next")} aria-label="Next month" style={{
          width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(45,74,45,0.15)",
          background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "transform 0.15s",
        }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#2D4A2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Live Google Calendar status — minimal, only shown when relevant */}
      {calendarStatus === "loading" && (
        <div style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#9B9B9B", marginBottom: "12px" }}>
          Checking live availability…
        </div>
      )}
      {calendarStatus === "error" && (
        <div style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#C0392B", marginBottom: "12px" }}>
          We couldn't load live availability right now — please contact us to confirm your dates.
        </div>
      )}

      {/* Single-month grid + legend */}
      <div onMouseLeave={() => setHoverDate(null)}>
        {renderMonth(currentMonth)}
      </div>

      {/* Selected dates summary — below the calendar */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px",
        background: "#F5EFE6", borderRadius: "16px", padding: "18px 20px", marginTop: "28px", marginBottom: "18px",
      }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#9B9B9B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>Check-In</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1C1C1C" }}>{dateStr(arrival)}</div>
        </div>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#9B9B9B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>Check-Out</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1C1C1C" }}>{dateStr(departure)}</div>
        </div>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#9B9B9B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>Nights</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600, color: nights > 0 && !minNightsMet ? "#C0392B" : "#1C1C1C" }}>
            {nights > 0 ? nights : "—"}{nights > 0 && !minNightsMet ? " (min 3)" : ""}
          </div>
        </div>
      </div>

      {/* Request button — below the calendar */}
      <button
        disabled={!arrival || !departure || !minNightsMet}
        onClick={() => onRequestDates({ arrival, departure, nights })}
        style={{
          width: "100%", padding: "18px",
          background: (!arrival || !departure || !minNightsMet) ? "#C9D6CC" : "#2D4A2D",
          color: "#fff", border: "none", borderRadius: "50px",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "16px",
          cursor: (!arrival || !departure || !minNightsMet) ? "not-allowed" : "pointer",
          letterSpacing: "0.03em",
          boxShadow: (!arrival || !departure || !minNightsMet) ? "none" : "0 6px 24px rgba(45,74,45,0.35)",
          transition: "background 0.25s, transform 0.2s, box-shadow 0.25s",
        }}
        onMouseEnter={e => { if (arrival && departure && minNightsMet) { e.target.style.background = "#4A7C59"; e.target.style.transform = "translateY(-2px)"; } }}
        onMouseLeave={e => { if (arrival && departure && minNightsMet) { e.target.style.background = "#2D4A2D"; e.target.style.transform = "translateY(0)"; } }}
      >Check Availability & Request My Quote</button>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#9B9B9B", textAlign: "center", margin: "14px 0 0", lineHeight: 1.6 }}>
        This is a booking request only. We'll review your requested dates and email you a quote to finalize your reservation.
      </p>
    </div>
  );
}

// ── Quote Request Form (Netlify Forms) ───────────────────────────────────────
function QuoteRequestForm({ camper, dates, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    campground: "", site: "", adults: "", children: "",
    age25: "", petsYesNo: "", petType: "", petCount: "",
    hookups: "", generator: "", heardAbout: "", comments: "",
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const dateStr = (d) => d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";

  // Lock body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const encode = (data) => Object.keys(data).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(data[k])).join("&");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      "form-name": "quote-request",
      camperName: camper.name,
      checkIn: dateStr(dates.arrival),
      checkOut: dateStr(dates.departure),
      nights: String(dates.nights),
      ...form,
    };
    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(payload),
      });
    } catch (err) {
      // Netlify Forms requires static deployment to function; this fails gracefully in preview
      console.warn("Form submission requires Netlify deployment:", err);
    }
    trackEvent("quote_request_submitted", {
      camper_name: camper.name,
      nights: dates.nights,
    });
    setSubmitting(false);
    setSubmitted(true);
    // Clear saved dates now that the request has been made
    try { localStorage.removeItem(`wkcr-dates-${camper.id}`); } catch {}
  };

  const inputStyle = (field) => ({
    width: "100%", boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif", fontSize: "14.5px",
    padding: "12px 14px", borderRadius: "10px",
    border: focusedField === field ? "1.5px solid #4A7C59" : "1.5px solid rgba(0,0,0,0.12)",
    background: focusedField === field ? "rgba(74,124,89,0.03)" : "#fff",
    outline: "none", color: "#1C1C1C",
    transition: "border-color 0.25s, background 0.25s",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(74,124,89,0.1)" : "none",
  });
  const labelStyle = { fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "12.5px", color: "#1C1C1C", letterSpacing: "0.03em", marginBottom: "6px", display: "block" };
  const sectionLabel = { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "16px", color: "#2D4A2D", margin: "26px 0 14px", paddingTop: "18px", borderTop: "1px solid rgba(0,0,0,0.07)" };
  const radioRow = { display: "flex", gap: "10px" };
  const radioBtn = (active) => ({
    flex: 1, textAlign: "center", padding: "11px", borderRadius: "10px", cursor: "pointer",
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "13.5px",
    border: active ? "1.5px solid #2D4A2D" : "1.5px solid rgba(0,0,0,0.12)",
    background: active ? "#2D4A2D" : "#fff",
    color: active ? "#fff" : "#1C1C1C",
    transition: "all 0.2s",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(20,28,20,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "min(5vh, 40px) 16px",
        animation: "wkcr-fadein 0.25s ease",
        overflowY: "auto",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FDFAF5", borderRadius: "24px", width: "100%", maxWidth: "640px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)", position: "relative",
          animation: "wkcr-fadeup 0.35s cubic-bezier(0.25,0.46,0.45,0.94) both",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "18px", right: "18px", zIndex: 2,
            width: "36px", height: "36px", borderRadius: "50%",
            background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="#1C1C1C" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>

        {submitted ? (
          /* ── Confirmation ── */
          <div style={{ padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "52px", marginBottom: "18px" }}>🎉</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#2D4A2D", fontSize: "30px", marginBottom: "12px" }}>Thank You!</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#444", fontSize: "15.5px", lineHeight: 1.75, marginBottom: "22px" }}>
              Your quote request has been received. We'll review your requested dates and email you a personalized quote as soon as possible.
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "14px", lineHeight: 1.75, marginBottom: "26px" }}>
              Once you receive your quote, you'll have two options:
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "30px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(74,124,89,0.1)", borderRadius: "50px", padding: "10px 18px" }}>
                <span style={{ color: "#4A7C59", fontWeight: 700 }}>✓</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "13.5px", color: "#2D4A2D" }}>Accept Quote & Pay</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.04)", borderRadius: "50px", padding: "10px 18px" }}>
                <span style={{ color: "#6B7B6B", fontWeight: 700 }}>✓</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "13.5px", color: "#444" }}>Decline, No Obligation</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "#2D4A2D", color: "#fff", border: "none", borderRadius: "50px", padding: "13px 32px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >Close</button>
          </div>
        ) : (
          /* ── Form ── */
          <form
            name="quote-request"
            method="POST"
            data-netlify="true"
            netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
            style={{ padding: "44px 36px 36px" }}
          >
            {/* Hidden fields required for Netlify static form detection */}
            <input type="hidden" name="form-name" value="quote-request" />
            <p style={{ display: "none" }}><label>Don't fill this out: <input name="bot-field" /></label></p>

            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "26px", marginBottom: "8px" }}>Request My Quote</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "14px", lineHeight: 1.65, marginBottom: "22px" }}>
              This is a booking request only. We'll review your request and email you a personalized quote to finalize your reservation.
            </p>

            {/* Trip summary */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "8px", border: "1px solid rgba(45,74,45,0.1)" }}>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Camper</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", fontWeight: 700, color: "#1C1C1C" }}>{camper.name}</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Check-In</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", fontWeight: 700, color: "#1C1C1C" }}>{dateStr(dates.arrival)}</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Check-Out</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", fontWeight: 700, color: "#1C1C1C" }}>{dateStr(dates.departure)}</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Nights</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", fontWeight: 700, color: "#1C1C1C" }}>{dates.nights}</div>
              </div>
            </div>

            {/* Guest Information */}
            <div style={sectionLabel}>Guest Information</div>
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Full Name *</label>
              <input name="name" required value={form.name} onChange={handleChange} placeholder="Jane Smith"
                style={inputStyle("name")} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="your@email.com"
                  style={inputStyle("email")} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input name="phone" required value={form.phone} onChange={handleChange} placeholder="(270) 820-8685"
                  style={inputStyle("phone")} onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} />
              </div>
            </div>

            {/* Trip Information */}
            <div style={sectionLabel}>Trip Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Campground or Event Name *</label>
                <input name="campground" required value={form.campground} onChange={handleChange} placeholder="e.g. Jellystone Mammoth Cave"
                  style={inputStyle("campground")} onFocus={() => setFocusedField("campground")} onBlur={() => setFocusedField(null)} />
              </div>
              <div>
                <label style={labelStyle}>Campsite Number (if known)</label>
                <input name="site" value={form.site} onChange={handleChange} placeholder="e.g. Site 42"
                  style={inputStyle("site")} onFocus={() => setFocusedField("site")} onBlur={() => setFocusedField(null)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Number of Adults *</label>
                <input name="adults" type="number" min="1" required value={form.adults} onChange={handleChange} placeholder="2"
                  style={inputStyle("adults")} onFocus={() => setFocusedField("adults")} onBlur={() => setFocusedField(null)} />
              </div>
              <div>
                <label style={labelStyle}>Number of Children *</label>
                <input name="children" type="number" min="0" required value={form.children} onChange={handleChange} placeholder="0"
                  style={inputStyle("children")} onFocus={() => setFocusedField("children")} onBlur={() => setFocusedField(null)} />
              </div>
            </div>

            {/* Rental Requirements */}
            <div style={sectionLabel}>Rental Requirements</div>
            <label style={labelStyle}>Are you at least 25 years old? *</label>
            <div style={radioRow}>
              {["Yes", "No"].map(opt => (
                <label key={opt} style={radioBtn(form.age25 === opt)}>
                  <input type="radio" name="age25" value={opt} checked={form.age25 === opt} onChange={handleChange} required style={{ display: "none" }} />
                  {opt}
                </label>
              ))}
            </div>
            {form.age25 === "No" && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#C0392B", marginTop: "8px", lineHeight: 1.5 }}>
                The primary renter must be at least 25 years old.
              </p>
            )}

            {/* Pets */}
            <div style={{ marginTop: "22px" }}>
              <label style={labelStyle}>Are you bringing pets? *</label>
              <div style={radioRow}>
                {["Yes", "No"].map(opt => (
                  <label key={opt} style={radioBtn(form.petsYesNo === opt)}>
                    <input type="radio" name="petsYesNo" value={opt} checked={form.petsYesNo === opt} onChange={handleChange} required style={{ display: "none" }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            {form.petsYesNo === "Yes" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
                  <div>
                    <label style={labelStyle}>What type of pet(s)?</label>
                    <input name="petType" value={form.petType} onChange={handleChange} placeholder="e.g. Dog"
                      style={inputStyle("petType")} onFocus={() => setFocusedField("petType")} onBlur={() => setFocusedField(null)} />
                  </div>
                  <div>
                    <label style={labelStyle}>How many pets?</label>
                    <input name="petCount" type="number" min="1" max="2" value={form.petCount} onChange={handleChange} placeholder="1"
                      style={inputStyle("petCount")} onFocus={() => setFocusedField("petCount")} onBlur={() => setFocusedField(null)} />
                  </div>
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#8B5E3C", marginTop: "8px", lineHeight: 1.5 }}>
                  Maximum of 2 pets allowed. All pets are subject to approval.
                </p>
              </>
            )}

            {/* Campsite Hookups */}
            <div style={sectionLabel}>Campsite Hookups</div>
            <label style={labelStyle}>What hookups are available at your campsite? *</label>
            <select name="hookups" required value={form.hookups} onChange={handleChange}
              style={{ ...inputStyle("hookups"), appearance: "none", cursor: "pointer" }}
              onFocus={() => setFocusedField("hookups")} onBlur={() => setFocusedField(null)}>
              <option value="">Select an option…</option>
              <option>Full Hookups (Water, Electric & Sewer)</option>
              <option>Water & Electric Only</option>
              <option>Electric Only (30 Amp)</option>
              <option>Electric Only (50 Amp)</option>
              <option>No Hookups (Dry Camping)</option>
              <option>I'm Not Sure</option>
            </select>

            {/* Generator Rental */}
            <div style={sectionLabel}>Generator Rental</div>
            <label style={labelStyle}>Would you like to add a generator rental?</label>
            <div style={radioRow}>
              {["Yes (+$35/day)", "No", "Not Sure"].map(opt => (
                <label key={opt} style={radioBtn(form.generator === opt)}>
                  <input type="radio" name="generator" value={opt} checked={form.generator === opt} onChange={handleChange} style={{ display: "none" }} />
                  {opt}
                </label>
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#6B7B6B", marginTop: "8px", lineHeight: 1.5 }}>
              <strong style={{ color: "#1C1C1C" }}>Generator Rental: $35/day.</strong> Recommended for campsites without electrical hookups.
            </p>

            {/* How did you hear about us */}
            <div style={sectionLabel}>How Did You Hear About Us?</div>
            <select name="heardAbout" value={form.heardAbout} onChange={handleChange}
              style={{ ...inputStyle("heardAbout"), appearance: "none", cursor: "pointer" }}
              onFocus={() => setFocusedField("heardAbout")} onBlur={() => setFocusedField(null)}>
              <option value="">Select an option…</option>
              <option>Google Search</option>
              <option>Google Maps</option>
              <option>Facebook</option>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>Friend or Family</option>
              <option>Campground</option>
              <option>Repeat Customer</option>
              <option>Event/Race</option>
              <option>Other</option>
            </select>

            {/* Comments */}
            <div style={{ marginTop: "22px", marginBottom: "8px" }}>
              <label style={labelStyle}>Additional Comments or Questions</label>
              <textarea name="comments" rows={5} value={form.comments} onChange={handleChange} placeholder="Anything else we should know?"
                style={{ ...inputStyle("comments"), resize: "vertical", minHeight: "110px" }}
                onFocus={() => setFocusedField("comments")} onBlur={() => setFocusedField(null)} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", marginTop: "18px", padding: "17px",
                background: submitting ? "#9fb8a4" : "#2D4A2D", color: "#fff", border: "none", borderRadius: "50px",
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "16px",
                cursor: submitting ? "wait" : "pointer", letterSpacing: "0.03em",
                boxShadow: "0 6px 24px rgba(45,74,45,0.32)",
                transition: "background 0.25s, transform 0.2s",
              }}
              onMouseEnter={e => { if (!submitting) e.target.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; }}
            >{submitting ? "Sending…" : "Request My Quote"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function FleetGallery({ imgs }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [lbScale, setLbScale] = useState(1);
  const touchStartX = useRef(null);

  const switchTo = (i) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 200);
  };

  const openLightbox = (i) => { setLbIndex(i); setLbScale(1); setLightbox(true); };
  const closeLightbox = () => { setLightbox(false); setLbScale(1); };
  const lbPrev = () => { setLbScale(1); setLbIndex(i => (i - 1 + imgs.length) % imgs.length); };
  const lbNext = () => { setLbScale(1); setLbIndex(i => (i + 1) % imgs.length); };

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') lbNext();
      else if (e.key === 'ArrowLeft') lbPrev();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  // Prevent body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? lbNext() : lbPrev();
    touchStartX.current = null;
  };

  const btnStyle = (side) => ({
    position: 'absolute', top: '50%',
    [side]: '16px',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '48px', height: '48px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff', fontSize: '20px',
    transition: 'background 0.2s',
    zIndex: 10,
  });

  return (
    <>
      {/* ── Main gallery image — large, natural aspect ratio ── */}
      <div
        onClick={() => openLightbox(active)}
        style={{
          width: '100%',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#f0ebe3',
          marginBottom: '12px',
          boxShadow: '0 6px 32px rgba(0,0,0,0.12)',
          cursor: 'zoom-in',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={imgs[active]}
          alt=""
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: '680px',
            objectFit: 'contain',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>

      {/* Click to zoom hint */}
      <div style={{
        textAlign: 'center', marginBottom: '10px',
        fontFamily: "'Inter', sans-serif", fontSize: '12px',
        color: '#1C1C1C', letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        fontWeight: 700,
      }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#9B9B9B" strokeWidth="1.4"/>
          <path d="M10 10l2.5 2.5" stroke="#9B9B9B" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M6 4v4M4 6h4" stroke="#9B9B9B" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Click photo to view full screen &amp; zoom
      </div>
      {imgs.length > 1 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(imgs.length, 5)}, 1fr)`,
          gap: '8px',
        }}>
          {imgs.map((img, i) => (
            <div
              key={i}
              onClick={() => switchTo(i)}
              style={{
                background: '#f0ebe3',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: active === i ? '2.5px solid #4A7C59' : '2.5px solid transparent',
                boxShadow: active === i ? '0 0 0 2px rgba(74,124,89,0.28)' : 'none',
                opacity: active === i ? 1 : 0.58,
                transition: 'opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '72px',
              }}
            >
              <img src={img} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: '68px', width: 'auto', height: 'auto', objectFit: 'contain' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.93)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-between',
            height: '100vh',
            overflow: 'hidden',
            boxSizing: 'border-box',
            paddingTop: '50px',
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Top bar: counter + close */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            height: '50px', zIndex: 10001,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', sans-serif", fontSize: '13px', letterSpacing: '0.1em' }}>
              {lbIndex + 1} / {imgs.length}
            </div>
            <button
              onClick={closeLightbox}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: '36px', height: '36px',
                color: '#fff', fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >✕</button>
          </div>

          {/* Main lightbox image — zoom on click */}
          <div style={{
            width: '100%',
            height: 'calc(100vh - 120px)', /* 50px top bar + 70px thumb strip */
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 72px',
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}>
            {/* Prev arrow */}
            {imgs.length > 1 && (
              <button
                onClick={lbPrev}
                style={btnStyle('left')}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
              >‹</button>
            )}

            <img
              src={imgs[lbIndex]}
              alt=""
              onClick={() => setLbScale(s => s === 1 ? 2 : 1)}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px',
                transform: `scale(${lbScale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
                cursor: lbScale === 1 ? 'zoom-in' : 'zoom-out',
                userSelect: 'none',
                flexShrink: 0,
              }}
            />

            {/* Next arrow */}
            {imgs.length > 1 && (
              <button
                onClick={lbNext}
                style={btnStyle('right')}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
              >›</button>
            )}
          </div>

          {/* Thumbnail strip at bottom */}
          {imgs.length > 1 && (
            <div style={{
              display: 'flex', gap: '8px', padding: '12px 20px 20px',
              overflowX: 'auto', maxWidth: '100%',
            }}>
              {imgs.map((img, i) => (
                <div
                  key={i}
                  onClick={() => { setLbIndex(i); setLbScale(1); }}
                  style={{
                    flexShrink: 0,
                    width: '64px', height: '48px',
                    borderRadius: '6px', overflow: 'hidden',
                    border: lbIndex === i ? '2px solid #4A7C59' : '2px solid rgba(255,255,255,0.15)',
                    opacity: lbIndex === i ? 1 : 0.5,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s, border-color 0.2s',
                    background: '#1a1a1a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <img src={img} alt="" style={{ maxWidth: '100%', maxHeight: '44px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Booking Progress Tracker ──────────────────────────────────────────────────
function BookingProgress() {
  const steps = [
    { num: "①", icon: "📅", label: "Check Availability" },
    { num: "②", icon: "📝", label: "Request My Quote" },
    { num: "③", icon: "📧", label: "Receive Your Quote" },
    { num: "④", icon: "✅", label: "Accept Quote & Pay" },
    { num: "⑤", icon: "🎉", label: "Reservation Confirmed" },
  ];
  const [ref, visible] = useScrollReveal();

  return (
    <div ref={ref} style={{
      marginBottom: "60px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
    }}>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(24px,3vw,32px)", marginBottom: "26px", textAlign: "center" }}>
        How Booking Works
      </h2>
      <div style={{
        display: "flex", alignItems: "stretch", justifyContent: "center",
        flexWrap: "wrap", gap: "0px",
        background: "#fff", borderRadius: "20px", padding: "28px 20px",
        border: "1px solid rgba(45,74,45,0.08)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
      }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", flex: "1 1 140px", minWidth: "120px", padding: "10px 8px",
              transition: "transform 0.25s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{
                width: "54px", height: "54px", borderRadius: "50%",
                background: "linear-gradient(135deg, #2D4A2D, #1a2e1a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", marginBottom: "10px",
                boxShadow: "0 4px 14px rgba(45,74,45,0.3)",
              }}>{step.icon}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", color: "#F4A01C", marginBottom: "4px" }}>{step.num}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "12.5px", color: "#1C1C1C", lineHeight: 1.35 }}>{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                flex: "0 0 auto", color: "#C9D6CC", fontSize: "18px", padding: "0 4px",
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: "rotate(0deg)" }}>
                  <path d="M7 4l6 6-6 6" stroke="#C9D6CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── What's Included Section ──────────────────────────────────────────────────
const INCLUDED_CATEGORIES = [
  {
    key: "sleeping",
    title: "Sleeping and Living Essentials",
    accent: "#4A7C59",
    bg: "#EAF1EC",
    items: [
      "4 King Pillows", "3 Standard Pillows", "Fresh Bed Linens",
      "King Mattress Protector", "Sofa Bed Mattress Protector", "King Quilt",
      "2 Additional Quilts", "Twin Sheet Set (Air Mattress)", "2 Throws", "Bath Towels & Washcloths",
    ],
    illustration: (
      <svg width="64" height="64" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="wi-bed-1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#F0EAE0"/>
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="#EAF1EC"/>
        <rect x="18" y="50" width="60" height="22" rx="6" fill="url(#wi-bed-1)" stroke="#D8CFC0"/>
        <rect x="14" y="62" width="68" height="10" rx="4" fill="#4A7C59"/>
        <rect x="22" y="38" width="16" height="14" rx="5" fill="#fff" stroke="#D8CFC0"/>
        <rect x="42" y="38" width="16" height="14" rx="5" fill="#fff" stroke="#D8CFC0"/>
        <rect x="14" y="48" width="68" height="4" fill="#F4A01C" opacity="0.8"/>
      </svg>
    ),
  },
  {
    key: "kitchen",
    title: "Kitchen Essentials",
    accent: "#8B5E3C",
    bg: "#F3ECE2",
    items: [
      "Keurig Coffee Maker", "Pots & Pans", "Cooking & Griddle Utensils",
      "Cutting Board", "Glass Measuring Bowl", "Colander", "Tea Pitcher",
      "Washable Plates, Bowls & Cups", "Dish Towels & Dishcloths", "Dish Drying Mat",
    ],
    illustration: (
      <svg width="64" height="64" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="46" fill="#F3ECE2"/>
        <rect x="30" y="20" width="14" height="22" rx="3" fill="#2D4A2D"/>
        <rect x="33" y="16" width="8" height="6" rx="2" fill="#1f3a1f"/>
        <path d="M30 22h14" stroke="#F4A01C" strokeWidth="2"/>
        <path d="M52 40c0-8 6-14 14-14s14 6 14 14" stroke="none" fill="#8B5E3C" opacity="0"/>
        <ellipse cx="48" cy="68" rx="26" ry="8" fill="#8B5E3C"/>
        <rect x="22" y="50" width="52" height="18" rx="3" fill="#A87850"/>
        <circle cx="34" cy="59" r="3" fill="#fff" opacity="0.7"/>
        <circle cx="48" cy="59" r="3" fill="#fff" opacity="0.7"/>
        <circle cx="62" cy="59" r="3" fill="#fff" opacity="0.7"/>
      </svg>
    ),
  },
  {
    key: "outdoor",
    title: "Outdoor Living",
    accent: "#F4A01C",
    bg: "#FCEFD5",
    items: [
      "Blackstone Propane Griddle", "S'mores Station", "Roasting Sticks",
      "Folding Table", "Tablecloth", "2 Zero Gravity Chairs",
    ],
    illustration: (
      <svg width="64" height="64" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="46" fill="#FCEFD5"/>
        <ellipse cx="48" cy="78" rx="30" ry="4" fill="#000" opacity="0.06"/>
        <path d="M48 36c6 10 10 16 10 22a10 10 0 0 1-20 0c0-6 4-12 10-22z" fill="#F4A01C"/>
        <path d="M48 46c3 6 5 9 5 13a5 5 0 0 1-10 0c0-4 2-7 5-13z" fill="#fff" opacity="0.6"/>
        <rect x="20" y="64" width="12" height="16" rx="2" fill="#2D4A2D"/>
        <rect x="64" y="64" width="12" height="16" rx="2" fill="#2D4A2D"/>
        <path d="M20 64l6-6 6 6M64 64l6-6 6 6" stroke="#2D4A2D" strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  {
    key: "cleaning",
    title: "Cleaning & Camping Essentials",
    accent: "#6E4A2D",
    bg: "#EFE7DA",
    items: [
      "Cleaning Supplies", "Water & Sewer Hoses", "Basement Storage Equipment",
      "Power Cord with Adapters", "Portable Sewer Tank (if needed)", "Generator (available upon request)",
    ],
    illustration: (
      <svg width="64" height="64" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="46" fill="#EFE7DA"/>
        <path d="M44 70 h28 l-3 18 a4 4 0 0 1-4 3.5 H51 a4 4 0 0 1-4-3.5 Z" fill="#2D4A2D"/>
        <path d="M44 70 h28 v4 h-28 Z" fill="#3A5A3A"/>
        <path d="M48 70 q10-10 20 0" stroke="#1f3a1f" strokeWidth="2.4" fill="none"/>
        <g transform="translate(26,30) rotate(-15)">
          <rect x="0" y="14" width="14" height="26" rx="3" fill="#fff" stroke="#C7BFAE"/>
          <rect x="3" y="2" width="8" height="14" rx="2" fill="#2D4A2D"/>
          <rect x="1" y="0" width="12" height="6" rx="2" fill="#1f3a1f"/>
        </g>
      </svg>
    ),
  },
];

const STARTER_SUPPLIES = [
  "Paper Plates", "Plastic Silverware", "Paper Towels", "Trash Bags",
  "RV Toilet Paper (RV-safe only, please)", "Dish Soap", "Hand Soap",
  "Aluminum Foil", "Sandwich Bags",
];

function IncludedCard({ cat, delay, visible }) {
  const [hov, setHov] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: "22px",
        border: "1px solid rgba(45,74,45,0.08)",
        boxShadow: hov ? "0 16px 38px rgba(0,0,0,0.10)" : "0 2px 16px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.3s ease",
        opacity: visible ? 1 : 0,
        animation: visible ? "wkcr-fadeup 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both" : "none",
        animationDelay: `${delay}ms`,
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}
    >
      <button
        onClick={() => isMobile && setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "22px 24px", background: "none", border: "none",
          cursor: isMobile ? "pointer" : "default", textAlign: "left", width: "100%",
        }}
      >
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: hov ? `0 8px 20px ${cat.accent}30` : "0 2px 10px rgba(0,0,0,0.06)",
          transform: hov ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
        }}>
          {cat.illustration}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "17px", margin: 0 }}>{cat.title}</h4>
        </div>
        {isMobile && (
          <span style={{
            fontSize: "18px", color: cat.accent,
            transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s",
          }}>+</span>
        )}
      </button>

      <div style={{
        maxHeight: open ? "600px" : "0px", overflow: "hidden",
        transition: "max-height 0.35s ease",
      }}>
        <div style={{ padding: "0 24px 24px" }}>
          {cat.items.map(item => (
            <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "9px", padding: "5px 0" }}>
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "16px", height: "16px", borderRadius: "50%",
                background: `${cat.accent}18`, flexShrink: 0, marginTop: "1px",
              }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.3 2.3L8.5 2.5" stroke={cat.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", color: "#444", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsIncludedSection({ sectionHeading, camperId }) {
  const [ref, visible] = useScrollReveal();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [starterOpen, setStarterOpen] = useState(true);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const includedCategories = camperId === "aspen-trail"
    ? INCLUDED_CATEGORIES.map(cat => {
        if (cat.key === "sleeping") {
          return {
            ...cat,
            items: [
              "4 Standard Pillows", "2 Travel Pillows", "Bed Linens (Mattress Protector, Sheet, Comforter)",
              "2 Quilts", "3 Throws", "Bath Towels & Washcloths",
            ],
          };
        }
        if (cat.key === "outdoor") {
          return {
            ...cat,
            items: cat.items
              .map(item => item.replace("Blackstone ", ""))
              .map(item => item === "2 Zero Gravity Chairs" ? "Camping Loveseat" : item),
          };
        }
        return cat;
      })
    : INCLUDED_CATEGORIES;

  return (
    <div ref={ref} style={{ marginBottom: "60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(24px,3vw,32px)", marginBottom: "10px" }}>
        What's Included With Your Rental
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "15px", lineHeight: 1.65, maxWidth: "640px", marginBottom: "30px" }}>
        We've stocked your camper with many of the essentials so you can pack lighter and spend more time making memories.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "22px", marginBottom: "22px",
      }}>
        {includedCategories.filter(c => c.key !== "cleaning").map((cat, i) => (
          <IncludedCard key={cat.key} cat={cat} delay={i * 80} visible={visible} />
        ))}
      </div>

      {/* Cleaning card + bottom callout, paired on desktop */}
      <div className="wkcr-included-pair" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px", marginBottom: "22px",
      }}>
        <IncludedCard
          cat={includedCategories.find(c => c.key === "cleaning")}
          delay={INCLUDED_CATEGORIES.length * 80}
          visible={visible}
        />

        {/* Bottom callout banner */}
        <div style={{
          background: "#FDFAF5",
          border: "1.5px solid #F4A01C",
          borderRadius: "22px",
          padding: "30px 32px",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
          opacity: visible ? 1 : 0,
          animation: visible ? "wkcr-fadeup 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both" : "none",
          animationDelay: `${(INCLUDED_CATEGORIES.length + 1) * 80}ms`,
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#1C1C1C", fontSize: "15.5px", lineHeight: 1.7, maxWidth: "520px", margin: 0 }}>
            Just bring your food, clothing, toiletries, and a sense of adventure — we'll take care of the rest.
          </p>
        </div>
      </div>

      {/* Starter supplies — gold highlighted */}
      <div style={{
        background: "linear-gradient(135deg, #FFFDF7, #FCEFD5)",
        border: "1.5px solid #F4A01C",
        borderRadius: "22px",
        boxShadow: "0 6px 24px rgba(244,160,28,0.16)",
        position: "relative", overflow: "hidden",
        opacity: visible ? 1 : 0,
        animation: visible ? "wkcr-fadeup 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both" : "none",
        animationDelay: `${(INCLUDED_CATEGORIES.length + 2) * 80}ms`,
      }}>
        {/* Ribbon */}
        <div style={{
          position: "absolute", top: "18px", right: "-38px",
          background: "#F4A01C", color: "#fff",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px",
          letterSpacing: "0.05em", padding: "5px 44px",
          transform: "rotate(40deg)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>STARTER SUPPLIES</div>

        <button
          onClick={() => isMobile && setStarterOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: "14px",
            padding: "24px 28px", background: "none", border: "none",
            cursor: isMobile ? "pointer" : "default", textAlign: "left", width: "100%",
          }}
        >
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%", flexShrink: 0,
            background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(244,160,28,0.25)",
          }}>
            <svg width="34" height="34" viewBox="0 0 96 96">
              <rect x="22" y="30" width="52" height="44" rx="6" fill="#F4A01C" opacity="0.15"/>
              <rect x="30" y="38" width="36" height="6" rx="3" fill="#F4A01C"/>
              <rect x="30" y="50" width="36" height="6" rx="3" fill="#8B5E3C"/>
              <rect x="30" y="62" width="22" height="6" rx="3" fill="#F4A01C"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "18px", margin: "0 0 2px" }}>Complimentary Starter Supplies</h4>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8B5E3C", fontWeight: 600 }}>Included at no extra cost</span>
          </div>
          {isMobile && (
            <span style={{ fontSize: "18px", color: "#8B5E3C", transform: starterOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s" }}>+</span>
          )}
        </button>

        <div style={{ maxHeight: starterOpen ? "600px" : "0px", overflow: "hidden", transition: "max-height 0.35s ease" }}>
          <div style={{
            padding: "0 28px 26px",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "6px 18px",
          }}>
            {STARTER_SUPPLIES.map(item => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "9px", padding: "4px 0" }}>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: "rgba(244,160,28,0.18)", flexShrink: 0, marginTop: "1px",
                }}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.3 2.3L8.5 2.5" stroke="#C77F0A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13.5px", color: "#444", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compact FAQ for camper detail pages ──────────────────────────────────────
function DetailFaq({ camper, sectionHeading }) {
  const [openIdx, setOpenIdx] = useState(null);

  const items = [
    {
      q: "What does the prep fee include?",
      a: "The $100 prep fee covers a thorough cleaning, sanitizing, and full preparation of the camper before every rental — fresh linens, stocked starter supplies, propane fill, and a complete walkthrough check so everything is ready when you arrive.",
    },
    {
      q: "What does the delivery fee include?",
      a: `Delivery is $5/mile from our home base in Central City, KY (42330). This covers transporting the ${camper.name} to your site, leveling and setup, hookup assistance, and a full walkthrough orientation, plus pickup at the end of your stay.`,
    },
    {
      q: "What events do you deliver to?",
      a: "We regularly deliver to ROMP, US 60 Dragway, Beech Bend Raceway, Beacon Dragway, and Loretta Lynn's Ranch. Don't see your event listed? Just ask — we're happy to discuss other locations.",
    },
    {
      q: "What campgrounds do you deliver to?",
      a: "We regularly deliver to Prizer Point, Canal, Hillman's Ferry, Indian Point, Holiday Hills, Jellystone, Beech Bend, Huggins Haven, Bryan Lake, Moutardier, Asel, and Scales Lake. Don't see your campground listed? Just ask — we're happy to check availability for your location.",
    },
  ];

  return (
    <div style={{ marginBottom: "60px" }}>
      {sectionHeading("FAQ")}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((item, i) => {
          const open = openIdx === i;
          return (
            <div key={item.q} style={{
              background: "#fff", borderRadius: "16px", overflow: "hidden",
              border: "1px solid rgba(45,74,45,0.08)", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}>
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "18px 22px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                }}
              >
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px", color: "#1C1C1C" }}>{item.q}</span>
                <span style={{
                  fontSize: "18px", color: "#4A7C59", flexShrink: 0,
                  transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s",
                }}>+</span>
              </button>
              <div style={{
                maxHeight: open ? "240px" : "0px", overflow: "hidden",
                transition: "max-height 0.3s ease",
              }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#6B7B6B", lineHeight: 1.7, padding: "0 22px 18px" }}>{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CamperDetailPage({ setPage, camperId }) {
  const [ref, visible] = useScrollReveal({ threshold: 0.01 });
  const [bookingRef, bookingVisible] = useScrollReveal({ threshold: 0.01 });
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [requestedDates, setRequestedDates] = useState(null);
  const camper = FLEET_DATA.find(c => c.id === camperId) || FLEET_DATA[0];

  const handleRequestDates = ({ arrival, departure, nights }) => {
    setRequestedDates({ arrival, departure, nights });
    setShowQuoteForm(true);
  };

  const sectionHeading = (label) => (
    <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(24px,3vw,32px)", marginBottom: "22px" }}>{label}</h2>
  );

  return (
    <div style={{ background: "#FDFAF5", minHeight: "100vh" }}>
      <Nav page="fleet" setPage={setPage} />

      {/* Page header — back link + name */}
      <div style={{
        background: "linear-gradient(135deg, #2D4A2D 0%, #1a2e1a 100%)",
        padding: "130px clamp(24px,6vw,80px) 40px",
        position: "relative", overflow: "hidden",
      }} ref={ref}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(244,160,28,0.13) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{
          position: "relative", zIndex: 1, maxWidth: "1180px", margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <a
            href="#"
            onClick={e => { e.preventDefault(); setPage("fleet"); window.scrollTo(0,0); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              color: "rgba(255,255,255,0.65)", fontFamily: "'Inter', sans-serif",
              fontSize: "13px", fontWeight: 600, textDecoration: "none", marginBottom: "20px",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#F4A01C"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to Our Fleet
          </a>
          <div style={{ display: "inline-block", background: "rgba(244,160,28,0.2)", color: "#F4A01C", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", padding: "5px 14px", borderRadius: "50px", marginBottom: "14px" }}>{camper.badge}</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", fontSize: "clamp(32px,4.5vw,52px)", margin: 0, lineHeight: 1.08, letterSpacing: "-0.02em" }}>{camper.name}</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.7)", fontSize: "17px", margin: "12px 0 0", maxWidth: "520px" }}>{camper.tagline}</p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "56px" }}>
            <path d="M0,56 C360,0 1080,56 1440,0 L1440,56 L0,56 Z" fill="#FDFAF5" />
          </svg>
        </div>
      </div>

      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "30px clamp(24px,6vw,40px) 0" }}>

        {/* ── HERO: gallery left, key info right ── */}
        <div className="wkcr-fleet-detail" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "48px", alignItems: "start", marginBottom: "20px" }}>
          <div>
            <FleetGallery imgs={camper.galleryImgs} />
          </div>
          <div>
            {/* Amenities */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "26px" }}>
              {[...(camper.detailPagePills || []), ...camper.amenities, ...(camper.detailPagePillsEnd || [])].map(a => (
                <span key={a.label} style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  fontFamily: "'Inter', sans-serif", fontSize: "12.5px", color: "#444",
                  padding: "8px 14px", background: "#fff", borderRadius: "50px",
                  border: "1px solid rgba(45,74,45,0.08)",
                }}>
                  <span>{a.icon}</span> {a.label}
                </span>
              ))}
            </div>

            {/* Pricing snapshot card */}
            <div style={{
              background: "linear-gradient(135deg, #FDFAF5, #F5EFE6)", borderRadius: "18px",
              padding: "22px 24px", border: "1px solid rgba(45,74,45,0.1)", marginBottom: "20px",
            }}>
              {camper.pricing.map((p, i) => (
                <div key={p.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < camper.pricing.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "13.5px" }}>{p.label}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: "#2D4A2D", fontSize: "13.5px" }}>{p.value}</span>
                </div>
              ))}
            </div>

            <a
              href="#booking-section"
              onClick={e => { e.preventDefault(); document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" }); }}
              style={{
                display: "block", textAlign: "center", width: "100%", boxSizing: "border-box",
                background: "#2D4A2D", color: "#fff", border: "none", borderRadius: "50px",
                padding: "16px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "15px",
                cursor: "pointer", letterSpacing: "0.03em", textDecoration: "none",
                boxShadow: "0 6px 22px rgba(45,74,45,0.32)",
                transition: "background 0.25s, transform 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#4A7C59"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#2D4A2D"; e.currentTarget.style.transform = "translateY(0)"; }}
            >Check Availability ↓</a>
          </div>
        </div>
      </div>

      {/* ── BOOKING SECTION (highest priority) ── */}
      <div id="booking-section" ref={bookingRef} style={{
        maxWidth: "1180px", margin: "40px auto 0", padding: "0 clamp(24px,6vw,40px)",
        opacity: bookingVisible ? 1 : 0,
        transform: bookingVisible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}>
        {sectionHeading("Check Availability")}
        <div style={{ marginBottom: "70px" }}>
          <AvailabilityCalendar onRequestDates={handleRequestDates} camperId={camper.id} />
        </div>

        <BookingProgress />

        {/* ── GUEST REVIEW ── */}
        <div style={{ marginBottom: "60px", display: "flex", justifyContent: "center" }}>
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "32px 36px",
            border: "1px solid rgba(45,74,45,0.08)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            maxWidth: "560px", textAlign: "center",
          }}>
            <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginBottom: "14px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="#F4A01C">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                </svg>
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#4a4a4a", fontSize: "15px", lineHeight: 1.75, fontStyle: "italic", marginBottom: "16px" }}>
              "They are such nice people and great to work with. The camper is very nice and the layout is great for a family. Cannot go wrong booking with them. We will be booking again!"
            </p>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "15px" }}>Cody Field</div>
            <div style={{ fontFamily: "'Inter', sans-serif", color: "#4A7C59", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "2px" }}>US 60 Dragway</div>
          </div>
        </div>

        {/* ── 2. WHAT'S INCLUDED ── */}
        <WhatsIncludedSection sectionHeading={sectionHeading} camperId={camperId} />

        {/* ── 5. RENTAL POLICIES ── */}
        <div style={{ marginBottom: "60px" }}>
          {sectionHeading("Rental Policies")}
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "8px 32px",
            border: "1px solid rgba(45,74,45,0.08)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          }}>
            {camper.policies.map((p, i) => (
              <div key={p} style={{
                display: "flex", alignItems: "flex-start", gap: "12px",
                padding: "16px 0", borderBottom: i < camper.policies.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
              }}>
                <span style={{ color: "#F4A01C", fontSize: "15px", flexShrink: 0, marginTop: "2px" }}>●</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#555", lineHeight: 1.65 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <DetailFaq camper={camper} sectionHeading={sectionHeading} />

        {/* Other camper link */}
        {FLEET_DATA.filter(c => c.id !== camper.id).map(other => (
          <div key={other.id} style={{
            marginBottom: "60px", background: "#fff", borderRadius: "20px",
            padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "16px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid rgba(45,74,45,0.08)",
          }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Also Available</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "20px" }}>{other.name}</div>
            </div>
            <button
              onClick={() => { setPage("camper-detail", other.id); window.scrollTo(0,0); }}
              style={{ background: "#2D4A2D", color: "#fff", border: "none", borderRadius: "50px", padding: "12px 28px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "14px", cursor: "pointer", letterSpacing: "0.03em", transition: "background 0.2s" }}
              onMouseEnter={e => e.target.style.background = "#4A7C59"}
              onMouseLeave={e => e.target.style.background = "#2D4A2D"}
            >View {other.name}</button>
          </div>
        ))}
      </div>

      <Footer setPage={setPage} />

      {showQuoteForm && requestedDates && (
        <QuoteRequestForm
          camper={camper}
          dates={requestedDates}
          onClose={() => setShowQuoteForm(false)}
        />
      )}
    </div>
  );
}

function BookingBtn({ setPage }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => { trackEvent("check_availability_click", { location: "booking_btn" }); setPage("fleet"); window.scrollTo(0,0); }}
      style={{ background: hov ? "#6E4A2D" : "#8B5E3C", color: "#fff", border: "none", borderRadius: "50px", padding: "14px 32px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px", cursor: "pointer", letterSpacing: "0.04em", transition: "background 0.25s, transform 0.2s, box-shadow 0.25s", transform: hov ? "translateY(-2px)" : "translateY(0)", boxShadow: hov ? "0 8px 24px rgba(139,94,60,0.45)" : "0 4px 16px rgba(139,94,60,0.3)" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >Check Availability</button>
  );
}

function FleetPage({ setPage }) {
  const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.01 });
  const [reviewsRef, reviewsVisible] = useScrollReveal();

  return (
    <div style={{ background: "#FDFAF5", minHeight: "100vh" }}>
      <Nav page="fleet" setPage={setPage} />

      {/* Page header */}
      <div style={{
        background: "linear-gradient(135deg, #2D4A2D 0%, #1a2e1a 100%)",
        padding: "140px clamp(24px,6vw,80px) 80px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }} ref={heroRef}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(244,160,28,0.13) 0%, transparent 60%)", pointerEvents: "none" }} />
        {/* Hero bg photo */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMAGES.hero})`, backgroundSize: "cover", backgroundPosition: "center 40%", opacity: 0.18 }} />
        <div style={{
          position: "relative", zIndex: 1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#F4A01C", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "18px" }}>
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
            Delivered & Set Up For You
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", fontSize: "clamp(36px,5vw,62px)", lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Our Fleet
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.75)", fontSize: "18px", lineHeight: 1.65, maxWidth: "540px", margin: "0 auto" }}>
            Two premium campers, fully equipped and ready to deliver. Choose your rig and we'll handle everything else.
          </p>
          {/* Quick stats bar */}

        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "56px" }}>
            <path d="M0,56 C360,0 1080,56 1440,0 L1440,56 L0,56 Z" fill="#FDFAF5" />
          </svg>
        </div>
      </div>

      {/* Fleet cards — same compact cards as homepage, each leads to its own detail page */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "60px clamp(24px,6vw,40px) 80px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "32px",
          marginBottom: "48px",
        }}>
          {FLEET_DATA.map((camper, i) => (
            <FleetCard
              key={camper.id}
              img={camper.heroImg}
              badge={camper.badge}
              name={camper.name}
              sleeps={camper.sleeps}
              desc={camper.tagline}
              amenities={camper.amenities.slice(0, 4).map(a => a.label)}
              visible={heroVisible}
              delay={i * 100}
              setPage={setPage}
              camperKey={camper.id}
            />
          ))}
        </div>

        {/* Pricing note — compact */}
        <div style={{
          background: "#fff", borderRadius: "20px", padding: "32px 40px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)", border: "1px solid rgba(45,74,45,0.08)",
          textAlign: "center", marginBottom: "20px",
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "15px", lineHeight: 1.75, maxWidth: "600px", margin: "0 auto 24px" }}>
            Our base rate is <strong style={{ color: "#2D4A2D" }}>$125/night</strong> plus a one-time <strong style={{ color: "#2D4A2D" }}>$100 prep fee</strong>. Delivery is <strong style={{ color: "#2D4A2D" }}>$5/mile</strong> from Central City, KY (zip 42330). We'll calculate your exact delivery cost when you request a quote — no surprises.
          </p>
          <BookingBtn setPage={setPage} />
        </div>
      </div>

      {/* ── GUEST REVIEWS ── */}
      <ReviewsSection
        reviewsRef={reviewsRef}
        reviewsVisible={reviewsVisible}
        setPage={setPage}
        reviews={REVIEWS.filter(r => (r.name === "Candace T." && r.tag === "Moors Campground") || r.name === "Katlin V.")}
      />

      <Footer setPage={setPage} />
    </div>
  );
}


// ── Meet the Owners Page ──────────────────────────────────────────────────────
function AboutPage({ setPage }) {
  const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.01 });
  const [s1Ref, s1Visible] = useScrollReveal();
  const [s2Ref, s2Visible] = useScrollReveal();
  const [s3Ref, s3Visible] = useScrollReveal();

  const photoStyle = (visible, delay = 0) => ({
    width: "100%",
    borderRadius: "20px",
    objectFit: "cover",
    display: "block",
    boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
  });

  const textBlock = (visible, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
  });

  return (
    <div style={{ background: "#FDFAF5", minHeight: "100vh" }}>
      <Nav page="about" setPage={setPage} />

      {/* Page header */}
      <div style={{
        background: "linear-gradient(135deg, #2D4A2D 0%, #1a2e1a 100%)",
        padding: "140px clamp(24px,6vw,80px) 80px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }} ref={heroRef}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(244,160,28,0.13) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{
          position: "relative", zIndex: 1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#F4A01C", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "18px" }}>
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
            Family Owned & Operated
            <span style={{ display: "inline-block", width: "28px", height: "1px", background: "#F4A01C", opacity: 0.6 }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", fontSize: "clamp(36px,5vw,62px)", lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Our Story
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.75)", fontSize: "18px", lineHeight: 1.65, maxWidth: "500px", margin: "0 auto" }}>
            The family behind Western KY Camper Rentals — and the reason every stay feels personal.
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "56px" }}>
            <path d="M0,56 C360,0 1080,56 1440,0 L1440,56 L0,56 Z" fill="#FDFAF5" />
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1060px", margin: "0 auto", padding: "70px clamp(24px,6vw,40px) 100px" }}>

        {/* Section 1 — Intro + owners photo */}
        <div ref={s1Ref} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "56px", alignItems: "center", marginBottom: "80px" }}>
          <div style={textBlock(s1Visible, 0)}>
            <div style={{ display: "inline-block", color: "#4A7C59", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "14px" }}>Welcome!</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(26px,3vw,38px)", marginBottom: "22px", lineHeight: 1.2 }}>
              Glad You Found Us!
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#555", fontSize: "15px", lineHeight: 1.85, marginBottom: "16px" }}>
              We are Emily and Daniel Rust, owners of WKCR. During the day, I am a teacher and Daniel is a local truck driver. We have 3 awesome kiddos and a dog named Ramblin' Rudy, who goes everywhere with us! We are a family owned and operated business out of Central City, KY.
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#555", fontSize: "15px", lineHeight: 1.85 }}>
              If you call, text, or email — you will speak to Emily. I handle all the communication, marketing, scheduling, paperwork, and interior cleaning. Daniel is a jack of all trades. He takes care of all the washing, driving and setting up, tank dumping, and makes sure our campers are delivered well maintained for every family.
            </p>
          </div>
          <img src={IMAGES.meet_owners} alt="Emily and Daniel Rust" style={{ ...photoStyle(s1Visible, 150), height: "480px" }} />
        </div>

        {/* Section 2 — Kids photo + our story */}
        <div ref={s2Ref} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "56px", alignItems: "center", marginBottom: "80px" }}>
          <img src={IMAGES.meet_kids} alt="The Rust kids" style={{ ...photoStyle(s2Visible, 0), height: "480px" }} />
          <div style={textBlock(s2Visible, 150)}>
            <div style={{ display: "inline-block", color: "#4A7C59", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "14px" }}>Our Story</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(26px,3vw,38px)", marginBottom: "22px", lineHeight: 1.2 }}>
              Family Tradition
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#555", fontSize: "15px", lineHeight: 1.85, marginBottom: "16px" }}>
              What started as a love for camping and making memories with our family has turned into a passion for helping others enjoy the outdoors without the hassle of owning a camper. We think the coolest part is connecting with folks from all over the US!
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#555", fontSize: "15px", lineHeight: 1.85 }}>
              We take pride in a safe, clean, and comfortable environment to make it feel like home. Whether you're planning a family getaway, race event, wedding, reunion, or simply need extra sleeping space for guests — we're here to make your experience easy and stress-free.
            </p>
          </div>
        </div>

        {/* Section 3 — Rudy + specialties */}
        <div ref={s3Ref} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "56px", alignItems: "center", marginBottom: "60px" }}>
          <div style={textBlock(s3Visible, 0)}>
            <div style={{ display: "inline-block", color: "#4A7C59", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "14px" }}>Meet Ramblin' Rudy 🐾</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(26px,3vw,38px)", marginBottom: "22px", lineHeight: 1.2 }}>
              Our Sidekick
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#555", fontSize: "15px", lineHeight: 1.85, marginBottom: "24px" }}>
              For more than 10 years, Ramblin' Rudy has been part of every adventure we can take him on. He reminds us that the best camping memories are made together, so we're happy to welcome your furry family members too — with prior approval.
            </p>
          </div>
          <img src={IMAGES.meet_rudy} alt="Rudy the dog" style={{ ...photoStyle(s3Visible, 150), height: "480px" }} />
        </div>

        {/* Google Reviews — simplified, two quote cards */}
        <div style={{ marginBottom: "60px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="#F4A01C">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                </svg>
              ))}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "clamp(24px,3vw,34px)", marginBottom: "10px" }}>
              What Our Guests Say
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#6B7B6B", fontSize: "15px" }}>
              Real reviews from real guests, straight from Google.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {REVIEWS.filter(r => r.name === "Denise J." || r.name === "Sarah J.").map((review, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: "20px", padding: "28px 26px",
                border: "1px solid rgba(45,74,45,0.08)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", top: "12px", right: "20px",
                  fontFamily: "Georgia, serif", fontSize: "64px", lineHeight: 1,
                  color: "rgba(244,160,28,0.10)", fontWeight: 700,
                }}>"</div>
                <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="14" height="14" viewBox="0 0 20 20" fill="#F4A01C">
                      <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"/>
                    </svg>
                  ))}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", color: "#4a4a4a", fontSize: "14px", lineHeight: 1.7, fontStyle: "italic", marginBottom: "16px" }}>
                  "{review.quote}"
                </p>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1C1C1C", fontSize: "14px" }}>
                  {review.name}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", color: "#4A7C59", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {review.tag}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a
              href="https://share.google/mWfoHSF3pkE3Z6EF5"
              target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "13px", color: "#4A7C59", textDecoration: "none" }}
            >Read more reviews on Google →</a>
          </div>
        </div>

        {/* CTA card */}
        <div style={{
          background: "linear-gradient(135deg, #2D4A2D, #1a2e1a)",
          borderRadius: "24px", padding: "52px 44px", textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(244,160,28,0.15), transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", fontSize: "clamp(22px,3vw,32px)", marginBottom: "12px" }}>
              Ready to Book With Us?
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.75)", fontSize: "16px", lineHeight: 1.65, maxWidth: "440px", margin: "0 auto 28px" }}>
              We'd love to help make your next adventure unforgettable. Reach out — you'll hear directly from Emily!
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { trackEvent("check_availability_click", { location: "footer_cta" }); setPage("fleet"); window.scrollTo(0,0); }}
                style={{ background: "#8B5E3C", color: "#fff", border: "none", borderRadius: "50px", padding: "14px 32px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 20px rgba(139,94,60,0.4)", transition: "background 0.2s, transform 0.2s" }}
                onMouseEnter={e => { e.target.style.background = "#6E4A2D"; e.target.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.target.style.background = "#8B5E3C"; e.target.style.transform = "translateY(0)"; }}
              >Check Availability</button>
              <button onClick={() => { setPage("fleet"); window.scrollTo(0,0); }}
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "2px solid rgba(255,255,255,0.45)", borderRadius: "50px", padding: "13px 30px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px", cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.1)"}
              >View Our Fleet</button>
            </div>
          </div>
        </div>

      </div>

      <Footer setPage={setPage} />
    </div>
  );
}

// ── Floating Text Us Button ──────────────────────────────────────────────────
function TextUsButton() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Business phone: (270) 820-8685 — sms: URI works cross-platform (iOS + Android) with ?&body=
  const smsHref = "sms:+12708208685?&body=" + encodeURIComponent("Hi! I'm interested in renting a camper.");

  return (
    <a
      href={smsHref}
      onClick={() => trackEvent("text_us_click", { location: "floating_button" })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "fixed",
        bottom: isMobile ? "18px" : "26px",
        right: isMobile ? "18px" : "26px",
        zIndex: 500,
        display: "flex", alignItems: "center", gap: "10px",
        background: hover ? "#F4A01C" : "#2D4A2D",
        color: "#fff",
        textDecoration: "none",
        fontFamily: "'Inter', sans-serif", fontWeight: 700,
        fontSize: isMobile ? "14px" : "15px",
        padding: isMobile ? "13px 18px" : "15px 24px",
        borderRadius: "50px",
        boxShadow: hover ? "0 8px 26px rgba(244,160,28,0.45)" : "0 6px 22px rgba(45,74,45,0.35)",
        transition: "background 0.25s, box-shadow 0.25s, transform 0.2s",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        cursor: "pointer",
        border: "2px solid rgba(255,255,255,0.15)",
      }}
      aria-label="Text us at (270) 820-8685"
    >
      <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1z" fill="#fff" opacity="0.95"/>
        <circle cx="8" cy="11" r="1.1" fill={hover ? "#F4A01C" : "#2D4A2D"}/>
        <circle cx="12" cy="11" r="1.1" fill={hover ? "#F4A01C" : "#2D4A2D"}/>
        <circle cx="16" cy="11" r="1.1" fill={hover ? "#F4A01C" : "#2D4A2D"}/>
      </svg>
      <span>Text Us</span>
    </a>
  );
}

// ── Root App — handles routing ─────────────────────────────────────────────────
// ── URL routing map (keeps state-based navigation in sync with real URLs for SEO) ──
const PAGE_PATHS = {
  home: "/",
  fleet: "/fleet",
  faq: "/faq",
  about: "/about",
  contact: "/contact",
};
const CAMPER_PATHS = {
  "cedar-creek": "/fleet/cedar-creek-silverback",
  "aspen-trail": "/fleet/aspen-trail",
};
const PAGE_TITLES = {
  home: "Western KY Camper Rentals | Premium Delivery Camper Rentals in Kentucky",
  fleet: "Our Fleet | Western KY Camper Rentals",
  faq: "Frequently Asked Questions | Western KY Camper Rentals",
  about: "Meet Us | Western KY Camper Rentals",
  contact: "Contact Us | Western KY Camper Rentals",
};
const CAMPER_TITLES = {
  "cedar-creek": "Cedar Creek Silverback Fifth Wheel Rental | Western KY Camper Rentals",
  "aspen-trail": "Aspen Trail Travel Trailer Rental | Western KY Camper Rentals",
};

function pathToPage(pathname) {
  for (const camperId in CAMPER_PATHS) {
    if (CAMPER_PATHS[camperId] === pathname) return { page: "camper-detail", camperId };
  }
  for (const key in PAGE_PATHS) {
    if (PAGE_PATHS[key] === pathname) return { page: key, camperId: null };
  }
  return { page: "home", camperId: null };
}

export default function App() {
  const initial = typeof window !== "undefined" ? pathToPage(window.location.pathname) : { page: "home", camperId: null };
  const [page, setPageState] = useState(initial.page);
  const [selectedCamperId, setSelectedCamperId] = useState(initial.camperId);

  // Keep the address bar in sync so every page has a real, indexable URL
  const syncUrl = (key, camperId) => {
    const path = key === "camper-detail" ? (CAMPER_PATHS[camperId] || "/fleet") : (PAGE_PATHS[key] || "/");
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  };

  const setPage = (key) => {
    setPageState(key);
    syncUrl(key, selectedCamperId);
    window.scrollTo(0, 0);
  };

  const setPageWithCamper = (key, camperId) => {
    if (camperId) setSelectedCamperId(camperId);
    setPageState(key);
    syncUrl(key, camperId || selectedCamperId);
    window.scrollTo(0, 0);
  };

  // Support browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const { page: p, camperId } = pathToPage(window.location.pathname);
      setPageState(p);
      if (camperId) setSelectedCamperId(camperId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Update document title per page for SEO
  useEffect(() => {
    if (page === "camper-detail" && selectedCamperId) {
      document.title = CAMPER_TITLES[selectedCamperId] || PAGE_TITLES.home;
    } else {
      document.title = PAGE_TITLES[page] || PAGE_TITLES.home;
    }
  }, [page, selectedCamperId]);

  // GA4 page_view tracking — fires on first load AND every client-side
  // route change (this app uses React state + pushState, not a full page
  // reload, so GA's automatic page_view alone would only ever fire once).
  // send_page_view is set to false in index.html specifically so this is
  // the single source of truth for page views, avoiding double-counting.
  useEffect(() => {
    trackEvent("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }, [page, selectedCamperId]);

  useEffect(() => {
    // Inject fonts + keyframes once at root
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
      @keyframes wkcr-bounce {
        0%   { transform: scale(1) translateY(0); }
        40%  { transform: scale(1.18) translateY(-5px); }
        65%  { transform: scale(0.95) translateY(2px); }
        85%  { transform: scale(1.06) translateY(-2px); }
        100% { transform: scale(1) translateY(0); }
      }
      @keyframes wkcr-fadeup {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes wkcr-fadein { from { opacity: 0; } to { opacity: 1; } }
      @keyframes wkcr-goldpulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,160,28,0.0); }
        50%       { box-shadow: 0 0 0 8px rgba(244,160,28,0.18); }
      }
      .wkcr-hiw-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px; max-width: 1260px; margin: 0 auto; align-items: stretch;
      }
      @media (max-width: 960px) { .wkcr-hiw-grid { grid-template-columns: repeat(2,1fr); gap:18px; } }
      @media (max-width: 560px) { .wkcr-hiw-grid { grid-template-columns: 1fr; gap:16px; } }
      /* Mobile nav */
      .wkcr-nav-desktop { display: flex !important; }
      .wkcr-hamburger   { display: none !important; }
      @media (max-width: 768px) {
        .wkcr-nav-desktop { display: none !important; }
        .wkcr-hamburger   { display: flex !important; }
      }
      @media (max-width: 900px) {
        .wkcr-contact-grid { grid-template-columns: 1fr !important; }
        .wkcr-fleet-detail { grid-template-columns: 1fr !important; }
        .wkcr-included-pair { grid-template-columns: 1fr !important; }
        .wkcr-why-grid { grid-template-columns: 1fr !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  let pageContent;
  if (page === "about")   pageContent = <AboutPage setPage={setPage} />;
  else if (page === "fleet")   pageContent = <FleetPage setPage={setPageWithCamper} />;
  else if (page === "camper-detail") pageContent = <CamperDetailPage setPage={setPageWithCamper} camperId={selectedCamperId} />;
  else if (page === "faq")     pageContent = <FAQPage setPage={setPage} />;
  else if (page === "contact") pageContent = <ContactPage setPage={setPage} />;
  else pageContent = <HomePage setPage={setPageWithCamper} />;

  return (
    <>
      {pageContent}
      <TextUsButton />
    </>
  );
}
