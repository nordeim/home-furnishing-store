# Reference Investigation — IKEA Singapore (public routes only)

Target: https://www.ikea.com/sg/en/ · Observed: 2026-11-18 via text fetch (no credentials, no writes).
Method note: per `replicate-web-app` skill boundaries — public-route observation only, no auth
probe, no write probe, no asset copying. All implementation below is original code, copy and
product names; Pexels imagery used under license with attribution in code comments.

## Verified (directly observed)
- Homepage IA: campaign hero ("More reasons to make a trip"), Christmas lottery CTA, real-tree
  + festive food promos, "Home design service" 2-room Flexi BTO feature, "happening now"
  horizontal cards (Family / For Business / Visit store / Food), 80-year brand story block.
  [Verified — homepage text fetch]
- Store footprint: 3 Singapore touchpoints referenced via "Visit an IKEA store".
  [Verified — homepage fetch; store names/cities cross-checked via general knowledge → treated as Reasoned]
- Range promise: furniture + accessories, "well-designed, functional and affordable", rooms
  incl. smart home, bedroom, sofas, dining, wardrobes, textiles, cookware, decorations.
  [Verified]

## Reasoned (supported, not fully exercised)
- PLP/PDP/cart/checkout/tracking flows follow standard IKEA global patterns (filters, article
  numbers, store-stock + aisle/bin, Family pricing, assembly/delivery services).
  [Reasoned — global pattern knowledge + homepage copy cues; not click-verified this session]
- Restaurant/Bistro/Swedish Food Market presence per "More ways to enjoy IKEA food".
  [Reasoned]

## Assumed (implementation decisions)
- Prices GST-inclusive, SGD, 9% GST back-calc for display transparency.
- Store slugs tampines/jurong/alexandra; aisle/bin format `A12-B04` invented.
- Promo codes WELCOME10/MAKAN15/FLAT20 invented for demo checkout.

## Unknown (with blockers)
- Exact authenticated flows (Family login, order history) — blocker: no credentials provided,
  auth-wall not crossed per skill §Phase 0 rule 6.
- Real product schema/API contracts — blocker: no network capture performed; rebuilt from
  observable IA instead.
- Pixel-level computed styles — blocker: no browser snapshot run in this environment;
  visual parity claimed at layout/IA level only, NOT pixel-perfect.

## Information architecture carried into NORDHEM (superset)
Home / Shop (filters+sort+search) / PDP (gallery, stock/aisle, reviews, related) / Bag /
Checkout (3-step + mock PayNow/GrabPay/Atome) / Order confirmation + tracking / Inspiration
rooms (shoppable) / Offers + promo codes / Services / Stores / Family (points calculator) /
Business (instant quote) / Food / Sustainability (buy-back estimator) / Planning tools
(room explorer + booking) / Search / Wishlist / Help.
