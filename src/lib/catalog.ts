/** Static catalogue fallback + seed source. Original names, copy and imagery via Pexels. */

interface SeedCategory {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

interface SeedProduct {
  slug: string;
  sku: string;
  name: string;
  tagline: string;
  description: string;
  details: string;
  categorySlug: string;
  priceCents: number;
  compareAtCents?: number;
  ratingAvg: string;
  ratingCount: number;
  colors: string[];
  materials: string;
  dimensions: string;
  imageUrls: string[];
  badges: string[];
  isNew: boolean;
  isBestseller: boolean;
  stockTotal: number;
}

const IMG = {
  sofa1: "https://images.pexels.com/photos/7587779/pexels-photo-7587779.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  sofa2: "https://images.pexels.com/photos/6585763/pexels-photo-6585763.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  sofa3: "https://images.pexels.com/photos/7061396/pexels-photo-7061396.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  armchair: "https://images.pexels.com/photos/23471276/pexels-photo-23471276.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living1: "https://images.pexels.com/photos/7546721/pexels-photo-7546721.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living2: "https://images.pexels.com/photos/6480211/pexels-photo-6480211.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living3: "https://images.pexels.com/photos/6527044/pexels-photo-6527044.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living4: "https://images.pexels.com/photos/5998061/pexels-photo-5998061.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living5: "https://images.pexels.com/photos/7546713/pexels-photo-7546713.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living6: "https://images.pexels.com/photos/36777522/pexels-photo-36777522.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bedkit1: "https://images.pexels.com/photos/7045996/pexels-photo-7045996.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bedkit2: "https://images.pexels.com/photos/30973390/pexels-photo-30973390.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bedkit3: "https://images.pexels.com/photos/30990851/pexels-photo-30990851.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bedkit4: "https://images.pexels.com/photos/7045991/pexels-photo-7045991.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  dining1: "https://images.pexels.com/photos/7546218/pexels-photo-7546218.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  dining2: "https://images.pexels.com/photos/3773579/pexels-photo-3773579.png?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  kitchen1: "https://images.pexels.com/photos/7533845/pexels-photo-7533845.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  kitchen2: "https://images.pexels.com/photos/7836570/pexels-photo-7836570.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  apt1: "https://images.pexels.com/photos/6492391/pexels-photo-6492391.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  apt2: "https://images.pexels.com/photos/7046007/pexels-photo-7046007.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

export const CATEGORIES: SeedCategory[] = [
  { slug: "living", name: "Living room", tagline: "Sofas, shelving & slow Sundays", description: "Modular sofas, lounge chairs, media storage and lighting for HDB and condo living rooms.", imageUrl: IMG.sofa1, sortOrder: 1 },
  { slug: "bedroom", name: "Bedroom", tagline: "Sleep deep in small spaces", description: "Storage beds, wardrobes and textiles sized for BTO bedrooms.", imageUrl: IMG.bedkit1, sortOrder: 2 },
  { slug: "dining", name: "Dining", tagline: "Extendable tables for makan nights", description: "Extendable tables, stackable chairs and sideboards for gatherings.", imageUrl: IMG.dining1, sortOrder: 3 },
  { slug: "kitchen", name: "Kitchen", tagline: "Modular systems for compact kitchens", description: "Modular kitchen frames, trolleys, cookware and smart storage.", imageUrl: IMG.kitchen1, sortOrder: 4 },
  { slug: "workspace", name: "Work from home", tagline: "Desks that fit the bomb shelter", description: "Compact desks, ergonomic chairs and acoustic lighting.", imageUrl: IMG.living6, sortOrder: 5 },
  { slug: "kids", name: "Kids & baby", tagline: "Grow-with-them furniture", description: "Convertible cots, loft beds, play storage and study desks.", imageUrl: IMG.apt2, sortOrder: 6 },
  { slug: "outdoor", name: "Balcony & outdoor", tagline: "Built for tropical weather", description: "Powder-coated steel, acacia and quick-dry textiles for balconies.", imageUrl: IMG.living5, sortOrder: 7 },
  { slug: "decor", name: "Decoration & textiles", tagline: "The final 10% that makes home", description: "Rugs, curtains, frames, vases and warm 2700K lighting.", imageUrl: IMG.living3, sortOrder: 8 },
];

export const PRODUCTS: SeedProduct[] = [
  { slug: "solbakken-3-seat-sofa", sku: "NH-100101", name: "SOLBAKKEN 3-seat sofa", tagline: "Deep seats, washable covers", description: "A deep-seated 3-seater with pocket-spring cushions and machine-washable covers — built for movie nights and afternoon naps in humid weather.", details: "Cover: 100% recycled polyester. Frame: solid pine + plywood. Cushions: pocket springs + recycled foam. Removable, washable covers.", categorySlug: "living", priceCents: 129900, compareAtCents: 159900, ratingAvg: "4.7", ratingCount: 412, colors: ["Light grey", "Midnight blue", "Oat"], materials: "Recycled polyester, pine, pocket springs", dimensions: "W208 × D92 × H84 cm", imageUrls: [IMG.sofa1, IMG.living1], badges: ["Bestseller", "-19%"], isNew: false, isBestseller: true, stockTotal: 64 },
  { slug: "havbris-lounge-chair", sku: "NH-100102", name: "HAVBRIS lounge chair", tagline: "Scandi curves, solid oak legs", description: "A sculptural lounge chair with a bent-ply shell and wool-blend upholstery. Pairs with the HAVBRIS footstool for full recline comfort.", details: "Shell: bent birch ply. Upholstery: 70% wool, 30% nylon. Legs: solid white oak, oiled.", categorySlug: "living", priceCents: 54900, ratingAvg: "4.8", ratingCount: 188, colors: ["Oat", "Sage", "Charcoal"], materials: "Birch ply, wool blend, oak", dimensions: "W72 × D80 × H76 cm", imageUrls: [IMG.armchair, IMG.living4], badges: ["Designer pick"], isNew: true, isBestseller: false, stockTotal: 41 },
  { slug: "skagen-media-bench", sku: "NH-100103", name: "SKAGEN media bench", tagline: "Cable chaos, solved", description: "Low media bench with ventilated back panels, push-to-open drawers and cut-outs for routers, consoles and soundbars.", details: "Particleboard with oak-foil finish. Ventilated rear. Max TV load 40 kg.", categorySlug: "living", priceCents: 34900, ratingAvg: "4.5", ratingCount: 264, colors: ["Oak", "White", "Walnut"], materials: "Particleboard, oak foil", dimensions: "W180 × D42 × H48 cm", imageUrls: [IMG.living2, IMG.sofa2], badges: [], isNew: false, isBestseller: true, stockTotal: 88 },
  { slug: "nordlys-floor-lamp", sku: "NH-100104", name: "NORDLYS floor lamp", tagline: "2700K warm glow", description: "Arc floor lamp with dimmable 2700K globe and foot-switch dimmer. Throws a warm pool of light over reading corners.", details: "E27 socket, 1× 8W LED globe included. Dimmer on cord. Height 168 cm.", categorySlug: "decor", priceCents: 12900, compareAtCents: 16900, ratingAvg: "4.6", ratingCount: 529, colors: ["Black", "Brass"], materials: "Powder-coated steel, opal glass", dimensions: "H168 × shade Ø28 cm", imageUrls: [IMG.living3, IMG.living6], badges: ["-24%"], isNew: false, isBestseller: true, stockTotal: 210 },
  { slug: "tampines-storage-bed", sku: "NH-200101", name: "TAMPINES storage bed", tagline: "4 drawers for BTO rooms", description: "Queen storage bed with four deep drawers on smooth runners — swallows bedsheets, luggage and seasonal clothes.", details: "Solid pine slats (17). Drawers: 60 kg total load. Fits 160×200 mattress.", categorySlug: "bedroom", priceCents: 89900, ratingAvg: "4.7", ratingCount: 356, colors: ["White", "Oak"], materials: "Pine, particleboard", dimensions: "Queen 160×200 cm", imageUrls: [IMG.bedkit1, IMG.bedkit4], badges: ["Bestseller"], isNew: false, isBestseller: true, stockTotal: 52 },
  { slug: "jurong-wardrobe-3door", sku: "NH-200102", name: "JURONG 3-door wardrobe", tagline: "Mirror door + interior fit-out", description: "Three-door wardrobe with a full-length mirror, hanging rails, and adjustable shelves. Anti-topple kit included for safety.", details: "Hinged doors with soft-close. Interior: 2 rails + 4 shelves. W150 × D58 × H200 cm.", categorySlug: "bedroom", priceCents: 74900, compareAtCents: 89900, ratingAvg: "4.4", ratingCount: 197, colors: ["White", "Grey-beige"], materials: "Particleboard, mirror glass", dimensions: "W150 × D58 × H200 cm", imageUrls: [IMG.bedkit2, IMG.bedkit3], badges: ["-17%"], isNew: false, isBestseller: false, stockTotal: 37 },
  { slug: "katong-bedside-table", sku: "NH-200103", name: "KATONG bedside table", tagline: "USB-C passthrough drawer", description: "Compact bedside table with a cable passthrough, soft-close drawer and open niche for books and glasses.", details: "W40 × D35 × H55 cm. Cable hole Ø5 cm at rear.", categorySlug: "bedroom", priceCents: 8900, ratingAvg: "4.6", ratingCount: 443, colors: ["Oak", "White", "Sage"], materials: "Ash veneer, MDF", dimensions: "W40 × D35 × H55 cm", imageUrls: [IMG.bedkit3, IMG.bedkit2], badges: [], isNew: true, isBestseller: false, stockTotal: 164 },
  { slug: "makan-extendable-table", sku: "NH-300101", name: "MAKAN extendable table", tagline: "Seats 4 → 8 for CNY", description: "Extendable dining table with a butterfly leaf stored inside — pull, fold, and seat eight for steamboat night.", details: "Seats 4 closed (140 cm), 8 open (200 cm). Solid acacia top, oiled.", categorySlug: "dining", priceCents: 79900, ratingAvg: "4.8", ratingCount: 289, colors: ["Acacia", "Black"], materials: "Solid acacia, steel", dimensions: "L140–200 × W85 × H75 cm", imageUrls: [IMG.dining1, IMG.dining2], badges: ["Bestseller"], isNew: false, isBestseller: true, stockTotal: 46 },
  { slug: "kopi-dining-chair-set2", sku: "NH-300102", name: "KOPI dining chair, set of 2", tagline: "Stackable rattan comfort", description: "Stackable dining chairs with curved rattan backs and solid rubberwood frames. Stack four high when guests leave.", details: "Set of 2. Stackable to 4. Max load 110 kg per chair.", categorySlug: "dining", priceCents: 24900, compareAtCents: 29900, ratingAvg: "4.5", ratingCount: 331, colors: ["Natural rattan", "Black"], materials: "Rattan, rubberwood", dimensions: "W46 × D54 × H82 cm", imageUrls: [IMG.dining2, IMG.dining1], badges: ["-17%"], isNew: false, isBestseller: false, stockTotal: 120 },
  { slug: "daun-sideboard", sku: "NH-300103", name: "DAUN sideboard", tagline: "Fluted fronts, push-open", description: "Low sideboard with fluted fronts and push-to-open doors — hides board games, table linen and chargers.", details: "W160 × D45 × H75 cm. Adjustable feet for uneven floors.", categorySlug: "dining", priceCents: 59900, ratingAvg: "4.6", ratingCount: 142, colors: ["Oak", "Deep green"], materials: "MDF, oak veneer", dimensions: "W160 × D45 × H75 cm", imageUrls: [IMG.living2, IMG.dining1], badges: ["New"], isNew: true, isBestseller: false, stockTotal: 33 },
  { slug: "hdb-kitchen-trolley", sku: "NH-400101", name: "HDB kitchen trolley", tagline: "Extra counter on wheels", description: "Rolling kitchen island with butcher-block top, spice rails and lockable castors — extra prep space that parks anywhere.", details: "Top: solid beech. 2 shelves + towel rail. Lockable castors.", categorySlug: "kitchen", priceCents: 21900, ratingAvg: "4.7", ratingCount: 518, colors: ["Beech/white", "Beech/black"], materials: "Beech, powder-coated steel", dimensions: "W90 × D50 × H92 cm", imageUrls: [IMG.kitchen1, IMG.kitchen2], badges: ["Bestseller"], isNew: false, isBestseller: true, stockTotal: 96 },
  { slug: "modular-kitchen-frame", sku: "NH-400102", name: "MODUL kitchen base frame", tagline: "Plan your kitchen per 20 cm", description: "Modular 20 cm-grid kitchen base frames with soft-close hinges — plan online, collect flat-pack, assemble in a weekend.", details: "Grid planning in 20 cm steps. 25-year hinge warranty. Doors sold separately.", categorySlug: "kitchen", priceCents: 18900, ratingAvg: "4.5", ratingCount: 176, colors: ["White", "Grey"], materials: "Galvanised steel, particleboard", dimensions: "W60 × D60 × H80 cm per frame", imageUrls: [IMG.kitchen2, IMG.kitchen1], badges: [], isNew: false, isBestseller: false, stockTotal: 240 },
  { slug: "wokhey-cookware-5pc", sku: "NH-400103", name: "WOKHEY cookware set, 5-pc", tagline: "Induction + kuali-ready", description: "Five-piece induction-ready set with a pre-seasoned carbon-steel wok — from stir-fry to soup in one stack.", details: "Carbon steel wok Ø32, saucepan 2 L, stockpot 5 L, lids. Induction + gas.", categorySlug: "kitchen", priceCents: 19900, compareAtCents: 25900, ratingAvg: "4.6", ratingCount: 624, colors: ["Black"], materials: "Carbon steel, stainless", dimensions: "Wok Ø32 cm", imageUrls: [IMG.kitchen1, IMG.apt1], badges: ["-23%"], isNew: false, isBestseller: true, stockTotal: 180 },
  { slug: "bto-compact-desk", sku: "NH-500101", name: "BTO compact desk", tagline: "110 cm with cable tray", description: "A 110 cm desk with a full-width cable tray, monitor shelf and rounded front edge for long WFH days.", details: "W110 × D60 × H75 cm. Cable tray + 3-port passthrough.", categorySlug: "workspace", priceCents: 27900, ratingAvg: "4.6", ratingCount: 238, colors: ["Oak/white", "Black"], materials: "Particleboard, steel", dimensions: "W110 × D60 × H75 cm", imageUrls: [IMG.living6, IMG.living1], badges: [], isNew: true, isBestseller: false, stockTotal: 74 },
  { slug: "ergonomi-task-chair", sku: "NH-500102", name: "ERGONOMI task chair", tagline: "12-year warranty mesh", description: "Full-mesh task chair with 4D arms, lumbar dial and synchro-tilt — rated for 12-hour days and 110 kg.", details: "Mesh back + seat. 4D arms. Synchro tilt with 4 locks. 12-year warranty.", categorySlug: "workspace", priceCents: 49900, compareAtCents: 64900, ratingAvg: "4.7", ratingCount: 391, colors: ["Grey", "Black"], materials: "Mesh, nylon, aluminium base", dimensions: "W68 × D66 × H102–115 cm", imageUrls: [IMG.armchair, IMG.living6], badges: ["-23%"], isNew: false, isBestseller: true, stockTotal: 58 },
  { slug: "loft-kids-bed", sku: "NH-600101", name: "LOFT junior loft bed", tagline: "Desk + wardrobe underneath", description: "Junior loft bed with integrated desk, wardrobe and bookshelf — a full bedroom in 3 sqm for growing kids.", details: "Bed 90×200. Desk + wardrobe included. Guard rails both sides.", categorySlug: "kids", priceCents: 89900, ratingAvg: "4.8", ratingCount: 164, colors: ["White/pine", "Grey"], materials: "Pine, MDF", dimensions: "L208 × W104 × H165 cm", imageUrls: [IMG.apt2, IMG.apt1], badges: ["Family pick"], isNew: true, isBestseller: false, stockTotal: 29 },
  { slug: "mainan-toy-storage", sku: "NH-600102", name: "MAINAN toy storage", tagline: "8 bins, tip-safe", description: "Eight tilted bins at kid height with anti-tip wall strap — tidy-up becomes a sorting game.", details: "8 removable bins. Anti-tip strap included. W90 × D40 × H82 cm.", categorySlug: "kids", priceCents: 14900, ratingAvg: "4.5", ratingCount: 287, colors: ["White/multi", "Natural"], materials: "Pine, recycled PP bins", dimensions: "W90 × D40 × H82 cm", imageUrls: [IMG.apt1, IMG.apt2], badges: [], isNew: false, isBestseller: false, stockTotal: 132 },
  { slug: "veranda-balcony-set", sku: "NH-700101", name: "VERANDA balcony set", tagline: "Table + 2 chairs, folds flat", description: "Powder-coated balcony set that folds flat against the railing — kopi mornings, rain or shine.", details: "Table Ø60 + 2 folding chairs. Powder-coated steel, acacia slats.", categorySlug: "outdoor", priceCents: 32900, compareAtCents: 39900, ratingAvg: "4.4", ratingCount: 149, colors: ["Acacia/black"], materials: "Acacia, steel", dimensions: "Table Ø60 × H72 cm", imageUrls: [IMG.living5, IMG.living4], badges: ["-18%"], isNew: false, isBestseller: false, stockTotal: 47 },
  { slug: "monstera-planter-duo", sku: "NH-700102", name: "MONSTERA planter duo", tagline: "Self-watering inserts", description: "Two powder-coated planters with self-watering inserts and drainage plugs — for balconies and corridors.", details: "Ø28 + Ø22 cm. Self-watering insert + drainage plug.", categorySlug: "outdoor", priceCents: 5900, ratingAvg: "4.6", ratingCount: 203, colors: ["Terracotta", "Sage", "Black"], materials: "Powder-coated steel", dimensions: "Ø28 and Ø22 cm", imageUrls: [IMG.living4, IMG.living5], badges: [], isNew: true, isBestseller: false, stockTotal: 220 },
  { slug: "pandan-rug-200", sku: "NH-800101", name: "PANDAN rug 200×300", tagline: "Flatweave, pet-friendly", description: "Hand-loomed flatweave rug in a pandan-inspired stripe — low pile that vacuums clean and survives claws.", details: "200×300 cm. 80% wool, 20% cotton. Hand-loomed.", categorySlug: "decor", priceCents: 29900, compareAtCents: 37900, ratingAvg: "4.5", ratingCount: 178, colors: ["Green/stripe", "Natural"], materials: "Wool, cotton", dimensions: "200×300 cm", imageUrls: [IMG.living1, IMG.living4], badges: ["-21%"], isNew: false, isBestseller: false, stockTotal: 63 },
  { slug: "blackout-curtain-pair", sku: "NH-800102", name: "MORNING blackout curtains, pair", tagline: "Blocks 99% for shift sleep", description: "Triple-weave blackout curtains that block 99% of light and dampen corridor noise — for bedrooms facing the MRT.", details: "Pair, each 145×250 cm. Triple weave, 350 GSM. Machine washable.", categorySlug: "decor", priceCents: 11900, ratingAvg: "4.6", ratingCount: 356, colors: ["Grey", "Beige", "Navy"], materials: "Triple-weave polyester", dimensions: "2× (145×250 cm)", imageUrls: [IMG.living6, IMG.living1], badges: [], isNew: false, isBestseller: true, stockTotal: 190 },
  { slug: "hygge-pendant-cluster", sku: "NH-800103", name: "HYGGE pendant cluster", tagline: "3 rattan shades", description: "Three hand-woven rattan pendants on one canopy — a warm island of light over dining tables.", details: "3 shades Ø32 cm. E27 ×3, bulbs included. Drop 40–120 cm adjustable.", categorySlug: "decor", priceCents: 24900, ratingAvg: "4.7", ratingCount: 129, colors: ["Natural rattan"], materials: "Rattan, steel canopy", dimensions: "3× Ø32 cm shades", imageUrls: [IMG.dining1, IMG.living3], badges: ["New"], isNew: true, isBestseller: false, stockTotal: 55 },
  { slug: "fjord-2seat-compact-sofa", sku: "NH-100105", name: "FJORD compact 2-seat sofa", tagline: "155 cm for small living rooms", description: "A 155 cm two-seater with slim arms and high legs — full sofa comfort that leaves walkway space in 3-room flats.", details: "W155 × D85 × H80 cm. High legs for robot vacuum. Washable covers.", categorySlug: "living", priceCents: 89900, ratingAvg: "4.6", ratingCount: 214, colors: ["Beige", "Forest", "Grey"], materials: "Polyester, pine, foam", dimensions: "W155 × D85 × H80 cm", imageUrls: [IMG.sofa3, IMG.sofa2], badges: ["Small-space"], isNew: true, isBestseller: false, stockTotal: 49 },
  { slug: "bukit-bookshelf-tall", sku: "NH-100106", name: "BUKIT tall bookshelf", tagline: "80 cm wide, wall-strapped", description: "Tall 200 cm bookshelf with adjustable shelves and included wall strap — holds 60 kg of books per shelf.", details: "W80 × D30 × H200 cm. 5 adjustable shelves. Wall strap included.", categorySlug: "living", priceCents: 19900, compareAtCents: 24900, ratingAvg: "4.5", ratingCount: 302, colors: ["Oak", "White", "Black-brown"], materials: "Particleboard", dimensions: "W80 × D30 × H200 cm", imageUrls: [IMG.living2, IMG.living6], badges: ["-20%"], isNew: false, isBestseller: false, stockTotal: 141 },
];

interface SeedStore {
  slug: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  imageUrl: string;
}

export const STORES: SeedStore[] = [
  { slug: "tampines", name: "NORDHEM Tampines", address: "60 Tampines North Drive 2, Singapore 528764", hours: "Mon–Sun 10:00–22:00 · Restaurant 09:30–21:00", phone: "+65 6788 0600", imageUrl: IMG.sofa1 },
  { slug: "jurong", name: "NORDHEM Jurong", address: "22 Jurong Port Road, Singapore 619114", hours: "Mon–Sun 10:00–22:00 · Restaurant 09:30–21:00", phone: "+65 6788 0601", imageUrl: IMG.dining1 },
  { slug: "alexandra", name: "NORDHEM Alexandra", address: "317 Alexandra Road, Singapore 159965", hours: "Mon–Sun 10:00–21:00 · Click & Collect till 21:30", phone: "+65 6788 0602", imageUrl: IMG.kitchen1 },
];

interface SeedInspiration {
  slug: string;
  title: string;
  room: string;
  sqm: number;
  budgetCents: number;
  description: string;
  imageUrl: string;
  productSlugs: string[];
}

export const INSPIRATIONS: SeedInspiration[] = [
  { slug: "2-room-flexi-bto-tampines", title: "A calm 2-room Flexi BTO in Tampines", room: "Whole home · 47 sqm", sqm: 47, budgetCents: 980000, description: "A retiree's low-maintenance home: washable sofa covers, a storage bed, and one statement pendant. Everything reachable, nothing to dust under.", imageUrl: IMG.apt1, productSlugs: ["fjord-2seat-compact-sofa", "tampines-storage-bed", "hygge-pendant-cluster"] },
  { slug: "5-room-makan-ready", title: "A 5-room flat built for makan nights", room: "Dining · 12 sqm", sqm: 12, budgetCents: 420000, description: "An extendable table, stackable rattan chairs and a fluted sideboard — seats four daily, eight for reunion dinner.", imageUrl: IMG.dining1, productSlugs: ["makan-extendable-table", "kopi-dining-chair-set2", "daun-sideboard"] },
  { slug: "wfh-corner-bomb-shelter", title: "A WFH corner that respects the bomb shelter", room: "Workspace · 4 sqm", sqm: 4, budgetCents: 310000, description: "A 110 cm desk, a real task chair and warm 2700K light turn an awkward nook into a room you'd choose to work in.", imageUrl: IMG.living6, productSlugs: ["bto-compact-desk", "ergonomi-task-chair", "nordlys-floor-lamp"] },
  { slug: "kids-share-one-room", title: "Two kids, one room, zero fights", room: "Kids · 10 sqm", sqm: 10, budgetCents: 360000, description: "A loft bed frees the floor for play; tilted bins make tidy-up a game. Anti-tip straps on everything climbable.", imageUrl: IMG.apt2, productSlugs: ["loft-kids-bed", "mainan-toy-storage"] },
  { slug: "balcony-kopi-nook", title: "A 3 sqm balcony kopi nook", room: "Outdoor · 3 sqm", sqm: 3, budgetCents: 150000, description: "A fold-flat set, two self-watering planters and one outdoor rug — the cheapest café in Singapore is your own balcony.", imageUrl: IMG.living5, productSlugs: ["veranda-balcony-set", "monstera-planter-duo"] },
  { slug: "renter-refresh-800", title: "A renter refresh under $800", room: "Living · 18 sqm", sqm: 18, budgetCents: 80000, description: "No drilling, no painting, no regrets: a flatweave rug, blackout curtains and a pendant cluster transform any rental.", imageUrl: IMG.living1, productSlugs: ["pandan-rug-200", "blackout-curtain-pair", "hygge-pendant-cluster"] },
];

interface PromoLike {
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  minSubtotalCents: number;
}

export const PROMOS: PromoLike[] = [
  { code: "WELCOME10", label: "10% off your first order over $150", kind: "percent", value: 10, minSubtotalCents: 15000 },
  { code: "MAKAN15", label: "15% off orders over $400", kind: "percent", value: 15, minSubtotalCents: 40000 },
  { code: "FLAT20", label: "$20 off orders over $250", kind: "fixed", value: 2000, minSubtotalCents: 25000 },
];

// Task 124 F-12: ONE recall definition. The API keyword filter and the
// shop-SSR searchProducts seam carried the identical literal expression
// (the Task-123 F-5 fix re-synchronized them by hand) — nothing structural
// prevented the next drift. Both seams now consume this helper (the
// sortProductList pattern: one seam, every consumer).
export function matchesProductQuery(
  p: { name: string; tagline: string; description: string; sku: string; categorySlug: string },
  needle: string,
): boolean {
  // Both sides lowercase: the haystack AND the needle. The duplicated
  // originals lowercased only the haystack, so a capitalized query
  // ("OUTDOOR", "Sofa") returned 0 results on both the API and the shop
  // SSR — caught by the F-12 seam pins the day the extraction landed.
  return `${p.name} ${p.tagline} ${p.description} ${p.sku} ${p.categorySlug}`.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Task 122 F-5: the min-spend display gate — the LIVE client-side promo
 * finder (cart + checkout totals preview). The pre-Task-122 `findPromo`
 * finder resolved a code regardless of subtotal, so the preview happily
 * showed WELCOME10's 10% on an $89 bag that placeOrder() refuses
 * (INVALID_PROMO — minimum $150). effectivePromo resolves a code ONLY when
 * the given subtotal meets its minimum: below it, the code is not effective
 * and the preview shows no discount — display and server refusal can no
 * longer diverge on this axis. The server re-validates every code at write
 * time in placeOrder() / /api/promotions/validate (ADR-005).
 * Task 138 F-4: `findPromo` (and its siblings findProduct + productImage —
 * zero consumers) was RETIRED here: dead exports since the cart/checkout
 * preview moved to this seam (the Task-114 lesson-8 discipline — retire
 * dead code when the replacement lands; a maintainer could "fix" display
 * behaviour in a seam no page reads).
 */
export function effectivePromo(
  code: string | null,
  subtotalCents: number,
): Pick<PromoLike, "kind" | "value"> | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  const promo = PROMOS.find((p) => p.code === c);
  if (!promo) return null;
  return subtotalCents >= promo.minSubtotalCents ? { kind: promo.kind, value: promo.value } : null;
}

/**
 * Task 123 F-2: the minimum-spend figure behind the honest below-minimum
 * notice. The cart's promo MESSAGE used to contradict the effectivePromo
 * gate — below the minimum the green "CODE applied" status persisted while
 * the Discount row vanished (browser-reproduced), and the code still
 * submitted to a server INVALID_PROMO at the Pay step. The notice quotes the
 * code's own minimum so the shopper knows exactly what to add. Pure display
 * source only — the server re-validates at write time (ADR-005).
 */
export function findPromoMinimumCents(code: string): number | null {
  const c = code.trim().toUpperCase();
  const promo = PROMOS.find((p) => p.code === c);
  return promo ? promo.minSubtotalCents : null;
}

/**
 * Display label for a store slug in customer-facing copy ("tampines" →
 * "Tampines"). Task 119: the order/track pages rendered the raw slug
 * ("Pickup at NORDHEM tampines") while BuyBox kept its own label map — this
 * is the single seam. The seed's full names carry the NORDHEM prefix, so
 * short labels derive from the slug itself (unit-pinned).
 */
export function storeName(slug: string): string {
  const s = slug.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Task 138 F-3: the ONE per-product discount-percent seam. The chip formula
 * (Math.round over the compare-at delta) was hand-duplicated at three sites
 * — the ProductCard chip, the PDP chip and the catalogMaxDiscountPercent
 * body (the Task-126 F-3 max seam landed without its per-product sibling) —
 * so a rounding or edge-rule change desynchronized card chips, PDP chips
 * and the marketing max claim silently. Every chip and the max derivation
 * below now consume this seam.
 */
export function productDiscountPercent(p: { priceCents: number; compareAtCents?: number | null }): number {
  return p.compareAtCents && p.compareAtCents > p.priceCents
    ? Math.round(((p.compareAtCents - p.priceCents) / p.compareAtCents) * 100)
    : 0;
}

/**
 * Task 126 F-3: the ONE max-discount derivation. "Up to 24% off" was a
 * hardcoded literal at five marketing surfaces (hero, header strip, offers
 * metadata ×2, offers copy) — a catalogue edit turned every claim into a lie
 * with the gates green. Same display formula as the PDP's per-product chip
 * (Math.round over the compare-at delta), applied across the catalogue —
 * composed through productDiscountPercent since Task 138 F-3.
 */
export function catalogMaxDiscountPercent(): number {
  return Math.max(0, ...PRODUCTS.map((p) => productDiscountPercent(p)));
}
