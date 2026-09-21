"use client";

import Link from "next/link";
import { History, Phone, Search, ShieldCheck, ShoppingBasket } from "lucide-react";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-card">
        <div className="brand-mark" aria-hidden="true"><ShoppingBasket size={34} /></div>
        <p className="eyebrow">MANA MART · VOICE SHOPPING</p>
        <h1>మన షాప్</h1>
        <p className="lead">తెలుగు, हिंदी, or Englishలో మాట్లాడండి. Products వెతకండి, cartలో add చేయండి, order confirm చేయండి.</p>

        <div className="topic-row" aria-label="Supported topics">
          <span>Groceries</span><span>Personal care</span><span>Live stock</span><span>Easy checkout</span>
        </div>

        <Link className="primary-cta" href="/call">
          <span className="cta-icon"><Phone fill="currentColor" size={22} /></span>
          Shop by voice
        </Link>

        <div className="privacy-note"><ShieldCheck size={17} /> కాల్ ప్రారంభించే ముందు రికార్డింగ్ అనుమతి అడుగుతాము.</div>

        <div className="feature-grid">
          <div><Search size={20} /><strong>Live product search</strong><span>Size, price, stock వెంటనే తెలుసుకోండి</span></div>
          <div><History size={20} /><strong>Simple cart</strong><span>Add, remove, total—all by voice</span></div>
        </div>
      </section>
      <Link href="/admin" className="admin-link">Admin console</Link>
    </main>
  );
}
