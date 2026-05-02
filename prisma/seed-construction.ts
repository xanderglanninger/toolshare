import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter } as any);

// Construction-focused images (tools, scaffolding, equipment, sites)
const IMGS = {
  drill:     "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80",
  grinder:   "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&w=1200&q=80",
  mixer:     "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
  scaffold:  "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&w=1200&q=80",
  ladder:    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
  generator: "https://images.unsplash.com/photo-1590725121172-6ec66d8e7a6c?auto=format&fit=crop&w=1200&q=80",
  saw:       "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1200&q=80",
  welder:    "https://images.unsplash.com/photo-1581147036324-c47a03a81d48?auto=format&fit=crop&w=1200&q=80",
  compactor: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=1200&q=80",
  site:      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
};

async function main() {
  console.log("🏗️  Seeding construction listings…");

  // Fetch existing seed users
  const [thabo, sarah, sipho, priya, james, nomsa] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { email: "thabo.molefe@test.com" } }),
    db.user.findUniqueOrThrow({ where: { email: "sarah.vdberg@test.com" } }),
    db.user.findUniqueOrThrow({ where: { email: "sipho.dlamini@test.com" } }),
    db.user.findUniqueOrThrow({ where: { email: "priya.naidoo@test.com" } }),
    db.user.findUniqueOrThrow({ where: { email: "james.pretorius@test.com" } }),
    db.user.findUniqueOrThrow({ where: { email: "nomsa.khumalo@test.com" } }),
  ]);

  const owners = [thabo, sarah, sipho, priya, james, nomsa];
  function owner(i: number) { return owners[i % owners.length]; }

  const listings = [
    // ── Power Tools ───────────────────────────────────────────────────────────
    {
      title: "SDS Plus Rotary Hammer Drill 1500W",
      description: "Heavy-duty SDS+ rotary hammer for concrete, brick and stone. Three functions: rotary, hammer+rotary, chisel. Includes 10-piece SDS bit set, depth gauge and carry case.",
      pricePerDay: 180, pricePerWeek: 850, depositAmount: 600,
      images: [IMGS.drill, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 100,
    },
    {
      title: "Bosch GSB 18V Combi Drill Set",
      description: "Cordless 18V combi drill/driver with 2×2Ah batteries, fast charger, 30-piece bit set and carry case. Suitable for timber, masonry and steel. Auto torque selection.",
      pricePerDay: 140, pricePerWeek: 650, depositAmount: 450,
      images: [IMGS.drill, IMGS.welder],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Angle Grinder 125mm 900W",
      description: "Compact 125mm angle grinder ideal for cutting tiles, metal pipe and rebar on site. Includes 5 cutting discs, 2 grinding discs and side handle.",
      pricePerDay: 90, pricePerWeek: 420, depositAmount: 300,
      images: [IMGS.grinder, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },
    {
      title: "Angle Grinder 230mm 2200W",
      description: "Professional 230mm heavy-duty angle grinder for large cutting and grinding tasks. Includes safety guard, two cutting discs and anti-vibration handle.",
      pricePerDay: 130, pricePerWeek: 600, depositAmount: 400,
      images: [IMGS.grinder, IMGS.welder],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 70,
    },
    {
      title: "Reciprocating Saw (Sabre Saw)",
      description: "Variable-speed reciprocating saw for demolition, pipe cutting and rough carpentry. Includes 6 bi-metal blades for wood/metal, pivoting shoe and case.",
      pricePerDay: 110, pricePerWeek: 500, depositAmount: 350,
      images: [IMGS.saw, IMGS.site],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Jigsaw Variable Speed 800W",
      description: "Professional pendulum-action jigsaw for curves and cutouts in wood, metal and ceramic tiles. Includes 10 assorted blades, dust blower and guide fence.",
      pricePerDay: 95, pricePerWeek: 440, depositAmount: 280,
      images: [IMGS.saw, IMGS.grinder],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 50,
    },
    {
      title: "Makita Circular Saw 185mm 1200W",
      description: "Powerful circular saw with carbide blade, parallel fence and dust blower. Perfect for cutting shutterboard, timber beams and roofing battens on site.",
      pricePerDay: 130, pricePerWeek: 600, depositAmount: 400,
      images: [IMGS.saw, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Mitre Saw 210mm Sliding",
      description: "Sliding compound mitre saw for precision cross-cuts and bevels in timber up to 210mm wide. Laser guide, dust bag and stand included. Ideal for door frames and skirting.",
      pricePerDay: 220, pricePerWeek: 1000, depositAmount: 700,
      images: [IMGS.saw, IMGS.welder],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 120,
    },
    {
      title: "Table Saw 254mm Portable",
      description: "Portable job-site table saw with 254mm blade, rip fence, mitre gauge and folding stand. Cuts up to 88mm deep at 90°. Suitable for flooring, framing and joinery.",
      pricePerDay: 280, pricePerWeek: 1300, depositAmount: 900,
      images: [IMGS.saw, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },
    {
      title: "Random Orbital Sander 125mm",
      description: "5-inch orbital sander with dust bag and hook-and-loop pad. Ideal for sanding plaster, wood and filler before painting. Includes 25 assorted sanding discs.",
      pricePerDay: 70, pricePerWeek: 320, depositAmount: 200,
      images: [IMGS.grinder, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 50,
    },

    // ── Mixing & Concrete ─────────────────────────────────────────────────────
    {
      title: "Concrete Mixer 140L Electric",
      description: "140-litre drum mixer, 0.5HP motor. Perfect for mortar, plaster and small concrete pours. Weighs 70kg — delivery to site strongly recommended.",
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 700,
      images: [IMGS.mixer, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 150,
    },
    {
      title: "Concrete Mixer 200L Petrol",
      description: "Petrol-powered 200L site mixer for larger pours. Self-discharging drum, rubber tyres and tow bar. Ideal where power is unavailable. Fuel not included.",
      pricePerDay: 380, pricePerWeek: 1700, depositAmount: 1000,
      images: [IMGS.mixer, IMGS.generator],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 200,
    },
    {
      title: "Paddle Mixer / Plaster Mixer",
      description: "Heavy-duty paddle drill mixer for plaster, tile adhesive, self-levelling compound and grout. 1800W motor, 120L capacity. Includes two mixing paddles.",
      pricePerDay: 150, pricePerWeek: 680, depositAmount: 450,
      images: [IMGS.mixer, IMGS.drill],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Poker Vibrator for Concrete",
      description: "Electric concrete poker vibrator with 35mm head and 6m flexible shaft. Removes air pockets for denser, stronger slabs. Includes spare head and storage bag.",
      pricePerDay: 120, pricePerWeek: 550, depositAmount: 300,
      images: [IMGS.mixer, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Floor Screed Levelling Tool Set",
      description: "Complete floor screeding set: screed rail guides, floats, straight-edge screed bars (1m, 2m, 3m) and corner tools. Perfect for slab and tile-bed work.",
      pricePerDay: 80, pricePerWeek: 360, depositAmount: 200,
      images: [IMGS.site, IMGS.mixer],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 60,
    },

    // ── Compaction & Ground Work ───────────────────────────────────────────────
    {
      title: "Wacker Plate Compactor 90kg",
      description: "90kg forward-moving plate compactor for compacting granular fill, gravel and sub-base material. Petrol-powered, 550m²/hr output. Perfect for paving and foundations.",
      pricePerDay: 350, pricePerWeek: 1600, depositAmount: 1000,
      images: [IMGS.compactor, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 180,
    },
    {
      title: "Reversible Plate Compactor 160kg",
      description: "Reversible 160kg compactor for cohesive soils and deeper layers. Forward and reverse travel, vibration indicator. Ideal for utility trenches and pavement bases.",
      pricePerDay: 500, pricePerWeek: 2200, depositAmount: 1500,
      images: [IMGS.compactor, IMGS.generator],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 220,
    },
    {
      title: "Trench Rammer / Jump Jack",
      description: "Petrol-powered trench rammer (jump jack) for compacting backfill in narrow trenches and confined areas. 68kg impact force, 700 blows/min. Safety bar included.",
      pricePerDay: 320, pricePerWeek: 1450, depositAmount: 900,
      images: [IMGS.compactor, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },

    // ── Scaffolding & Access ──────────────────────────────────────────────────
    {
      title: "Mobile Scaffold Tower 4m (Aluminium)",
      description: "Lightweight aluminium scaffold tower reaches 4m working height. Quick-lock frames, castors with brakes, guardrail and access ladder included. Max load 250kg.",
      pricePerDay: 320, pricePerWeek: 1450, depositAmount: 1000,
      images: [IMGS.scaffold, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 200,
    },
    {
      title: "Mobile Scaffold Tower 6m (Aluminium)",
      description: "6m working height aluminium tower with double guardrails, toeboard, trapdoor platform and stabilisers. Load 200kg. Ideal for ceilings, fascias and signage.",
      pricePerDay: 450, pricePerWeek: 2000, depositAmount: 1500,
      images: [IMGS.scaffold, IMGS.ladder],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 35, deliveryFee: 250,
    },
    {
      title: "System Scaffold Set (30m²)",
      description: "Cup-lock system scaffolding for 30m² of facade. Includes standards, ledgers, transoms, base plates, boards and guardrail. Delivery and collection included within 40km.",
      pricePerDay: 800, pricePerWeek: 3500, depositAmount: 3000,
      images: [IMGS.scaffold, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 400,
    },
    {
      title: "Extension Ladder 8m Aluminium",
      description: "Lightweight 8m aluminium extension ladder, anti-slip rubber feet, 150kg load rating. Ideal for gutters, roof work, painting and electrical installations.",
      pricePerDay: 100, pricePerWeek: 460, depositAmount: 300,
      images: [IMGS.ladder, IMGS.site],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Extension Ladder 12m Fibreglass",
      description: "12m fibreglass extension ladder, non-conductive for electrical work. 135kg load rating, stabiliser bar and rubber anti-slip feet. Compliant with EN 131.",
      pricePerDay: 160, pricePerWeek: 730, depositAmount: 500,
      images: [IMGS.ladder, IMGS.scaffold],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },
    {
      title: "Trestle Scaffold Set (Pair + Boards)",
      description: "Pair of steel trestle scaffolding legs adjustable from 1m–1.8m, plus three 225mm × 3.6m scaffold boards. Great for interior plastering, painting and ceilings.",
      pricePerDay: 180, pricePerWeek: 800, depositAmount: 400,
      images: [IMGS.scaffold, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 120,
    },

    // ── Generators & Power ────────────────────────────────────────────────────
    {
      title: "Petrol Generator 3.5KVA",
      description: "Reliable 3.5KVA petrol generator with two 230V sockets and USB port. ~8hr runtime on full tank. Great for construction sites and load-shedding. Fuel not included.",
      pricePerDay: 350, pricePerWeek: 1600, depositAmount: 1000,
      images: [IMGS.generator, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 200,
    },
    {
      title: "Silent Diesel Generator 8KVA",
      description: "Sound-proofed 8KVA diesel generator for continuous site power. Electric start, 15L tank (~10hr run), 230V + 380V outlets. Certificate of compliance included.",
      pricePerDay: 700, pricePerWeek: 3200, depositAmount: 3000,
      images: [IMGS.generator, IMGS.site],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 50, deliveryFee: 350,
    },
    {
      title: "Site Distribution Board (32A)",
      description: "Portable site-safe distribution board: 32A 3-phase input, 6× 16A sockets, RCD protection and IP54 enclosure. Meets OHS Act site requirements.",
      pricePerDay: 200, pricePerWeek: 900, depositAmount: 600,
      images: [IMGS.generator, IMGS.drill],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 100,
    },
    {
      title: "50m Heavy-Duty Extension Reel",
      description: "50m × 2.5mm² industrial extension reel, 16A plug, 4 gang socket with thermal overload. Ideal for powering multiple tools simultaneously on large sites.",
      pricePerDay: 60, pricePerWeek: 270, depositAmount: 150,
      images: [IMGS.generator, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 40,
    },

    // ── Welding ───────────────────────────────────────────────────────────────
    {
      title: "MIG Welder 200A",
      description: "200A MIG/MAG welder for steel and stainless up to 8mm. Wire feed, argon/CO₂ input, includes 5kg wire reel, earth clamp and welding mask. Garage or site use.",
      pricePerDay: 280, pricePerWeek: 1250, depositAmount: 1000,
      images: [IMGS.welder, IMGS.site],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 120,
    },
    {
      title: "Arc Welder 160A (Stick Welder)",
      description: "Portable IGBT inverter arc welder for E6013/E7018 electrodes. Suitable for gates, fences and structural steel repairs. Includes mask, chipping hammer and brush.",
      pricePerDay: 180, pricePerWeek: 820, depositAmount: 500,
      images: [IMGS.welder, IMGS.grinder],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "TIG Welder 200A AC/DC",
      description: "AC/DC TIG welder for aluminium and stainless steel. High-frequency start, foot pedal and torch included. For precision work such as railings, tanks and pipework.",
      pricePerDay: 420, pricePerWeek: 1900, depositAmount: 1500,
      images: [IMGS.welder, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: false,
    },
    {
      title: "Gas Cutting Torch Set (Oxy-Acetylene)",
      description: "Full oxy-acetylene cutting and welding set: regulators, hoses, cutting torch, welding torch and goggles. Cylinders NOT included — hire your own from gas supplier.",
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 800,
      images: [IMGS.welder, IMGS.grinder],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 100,
    },
    {
      title: "Plasma Cutter 50A",
      description: "50A inverter plasma cutter for clean cuts in steel, stainless and aluminium up to 16mm. Air compressor compatible (min 4 bar). Includes 5 consumable kits.",
      pricePerDay: 350, pricePerWeek: 1600, depositAmount: 1200,
      images: [IMGS.welder, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },

    // ── Breaking & Demolition ─────────────────────────────────────────────────
    {
      title: "Electric Demolition Hammer 1750W",
      description: "32mm hex demolition hammer for breaking concrete, tiles and old screed. Variable impact energy, vibration dampening handle and 3 chisels included.",
      pricePerDay: 280, pricePerWeek: 1250, depositAmount: 800,
      images: [IMGS.drill, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 100,
    },
    {
      title: "Pneumatic Breaker + Compressor Combo",
      description: "60L 3HP compressor with pneumatic jack hammer for large-scale concrete breaking. Output 90J impact. Includes 3 steel chisels and 15m air hose.",
      pricePerDay: 550, pricePerWeek: 2500, depositAmount: 2000,
      images: [IMGS.drill, IMGS.compactor],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 250,
    },
    {
      title: "Diamond Core Drill 152mm",
      description: "Wet/dry diamond core drill for precise circular penetrations in concrete walls and floors up to 152mm diameter. Includes stand, vacuum base and 3 core bits.",
      pricePerDay: 380, pricePerWeek: 1700, depositAmount: 1200,
      images: [IMGS.drill, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 120,
    },

    // ── Lifting & Material Handling ────────────────────────────────────────────
    {
      title: "Material Hoist 200kg (Chain Block)",
      description: "Manual chain block hoist, 200kg SWL, 3m lift. Mounts to beam clamp or hook bracket. Perfect for lifting bricks, cement bags and steel sections.",
      pricePerDay: 120, pricePerWeek: 550, depositAmount: 300,
      images: [IMGS.scaffold, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 80,
    },
    {
      title: "Electric Chain Hoist 500kg",
      description: "500kg electric chain hoist, 6m lift, single-phase 230V motor. Push-button pendant control. For workshops, site structures and steel erection.",
      pricePerDay: 300, pricePerWeek: 1350, depositAmount: 1000,
      images: [IMGS.scaffold, IMGS.generator],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: false,
    },
    {
      title: "Telehandler / Loadall 3T 7m Reach",
      description: "3-tonne telescopic handler with 7m reach. Standard pallet forks, man-basket and brick grab available. Operator included in price. Fuel extra.",
      pricePerDay: 3500, pricePerWeek: 16000, depositAmount: 5000,
      images: [IMGS.site, IMGS.scaffold],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 60, deliveryFee: 1200,
    },
    {
      title: "Pallet Jack 2.5T",
      description: "Manual hydraulic pallet jack, 2500kg capacity, 1150mm × 540mm forks. Ideal for moving block pallets, cement bags and steel sections on flat surfaces.",
      pricePerDay: 100, pricePerWeek: 450, depositAmount: 250,
      images: [IMGS.compactor, IMGS.site],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Builder's Wheelbarrow (6 Cubic Ft)",
      description: "Heavy-duty steel contractor wheelbarrow, 6 cu ft capacity, pneumatic tyre and reinforced handles. Set of 2 available. Perfect for moving sand, rubble and concrete.",
      pricePerDay: 50, pricePerWeek: 220, depositAmount: 100,
      images: [IMGS.site, IMGS.mixer],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 40,
    },

    // ── Formwork & Shuttering ─────────────────────────────────────────────────
    {
      title: "Steel Formwork Panel Set (20m²)",
      description: "Modular steel shutter panels for 20m² of wall or column formwork. Includes tie rods, wing nuts and wedge clamps. For footings, walls, columns and beams.",
      pricePerDay: 700, pricePerWeek: 3000, depositAmount: 2500,
      images: [IMGS.site, IMGS.scaffold],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 350,
    },
    {
      title: "Acrow Prop Adjustable Steel Shores (Set of 10)",
      description: "Set of 10 Acrow props adjustable 1.75m–3.1m, 15kN SWL each. For propping suspended slabs, beams and during demolition. Forkhead and baseplates included.",
      pricePerDay: 350, pricePerWeek: 1500, depositAmount: 1000,
      images: [IMGS.scaffold, IMGS.site],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 200,
    },

    // ── Measuring & Levelling ─────────────────────────────────────────────────
    {
      title: "Rotary Laser Level Kit",
      description: "Self-levelling rotary laser level with tripod, staff and receiver. Range 300m diameter. Ideal for setting floors, setting-out foundations and checking grades.",
      pricePerDay: 300, pricePerWeek: 1350, depositAmount: 1000,
      images: [IMGS.site, IMGS.ladder],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 100,
    },
    {
      title: "Total Station (Survey Theodolite)",
      description: "Electronic total station for site set-out, boundary surveys and as-built surveys. 5\" accuracy, reflectorless measurement up to 200m. Tripod and prism included.",
      pricePerDay: 900, pricePerWeek: 4000, depositAmount: 3500,
      images: [IMGS.site, IMGS.scaffold],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },
    {
      title: "Digital Dumpy Level (Auto-Level)",
      description: "Optical auto-level, 32× magnification, with fibreglass tripod and 5m staff. For setting out levels on building sites, road works and landscaping projects.",
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 800,
      images: [IMGS.site, IMGS.ladder],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Laser Line Level Cross-Line Kit",
      description: "3×360° cross-line laser with magnetic bracket, tripod and receiver. Indoor range 50m. Perfect for tiling, partition walls, electrical conduit and suspended ceilings.",
      pricePerDay: 120, pricePerWeek: 550, depositAmount: 350,
      images: [IMGS.site, IMGS.drill],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },

    // ── Pumping ───────────────────────────────────────────────────────────────
    {
      title: "Submersible Water Pump 1.5kW",
      description: "Electric submersible pump for dewatering excavations, flooded basements and pools. 1.5kW, 400L/min, 10m head, 25mm outlet. 10m power cable included.",
      pricePerDay: 180, pricePerWeek: 820, depositAmount: 500,
      images: [IMGS.generator, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 90,
    },
    {
      title: "Petrol Trash / Sewage Pump 3\"",
      description: "3-inch petrol trash pump for dirty water with solids up to 25mm. 700L/min, 25m head. Ideal for dewatering trenches, building sites and flood areas.",
      pricePerDay: 280, pricePerWeek: 1250, depositAmount: 800,
      images: [IMGS.generator, IMGS.compactor],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 35, deliveryFee: 150,
    },
    {
      title: "Grout Pump / Plaster Pump",
      description: "Electric grout and render pump for injecting grout into walls, post-tension ducts or pumping plaster. 20L hopper, 6m hose and 2 nozzle sizes included.",
      pricePerDay: 450, pricePerWeek: 2000, depositAmount: 1200,
      images: [IMGS.mixer, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },

    // ── Compressors ───────────────────────────────────────────────────────────
    {
      title: "Air Compressor 50L 2HP",
      description: "50L tank, 2HP belt-drive air compressor. Ideal for pneumatic nailers, spray guns, tyre inflation and blowguns on site. Includes 5m hose and regulator.",
      pricePerDay: 150, pricePerWeek: 680, depositAmount: 400,
      images: [IMGS.generator, IMGS.drill],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Portable Air Compressor 100L 3HP",
      description: "100L twin-piston air compressor, 8 bar working pressure, 10.5 CFM. Suitable for spray painting, sandblasting and heavy pneumatic tools. Wheeled trolley.",
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 700,
      images: [IMGS.generator, IMGS.site],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 100,
    },

    // ── Flooring ──────────────────────────────────────────────────────────────
    {
      title: "Floor Tile Cutter 900mm Manual",
      description: "Manual rail tile cutter for porcelain and ceramic tiles up to 900mm wide. Double guide rail, tungsten carbide scoring wheel and measurement gauge.",
      pricePerDay: 110, pricePerWeek: 500, depositAmount: 300,
      images: [IMGS.saw, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Wet Diamond Tile Saw 300mm",
      description: "Wet diamond bench saw for precision cuts in porcelain, granite and marble tiles up to 300mm. Water pump, mitre fence, laser guide and 2 blades included.",
      pricePerDay: 220, pricePerWeek: 1000, depositAmount: 600,
      images: [IMGS.saw, IMGS.grinder],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Floor Grinder / Scarifier 400mm",
      description: "Walk-behind floor grinder for removing glue, paint and coatings from concrete slabs. 400mm working width, vacuum-compatible, includes diamond cup wheel.",
      pricePerDay: 450, pricePerWeek: 2000, depositAmount: 1500,
      images: [IMGS.grinder, IMGS.site],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 35, deliveryFee: 200,
    },
    {
      title: "Power Trowel (Helicopter) 600mm",
      description: "Petrol-powered power trowel for finishing concrete slabs to a smooth, dense surface. 600mm blade diameter, finger guard and transport wheels included.",
      pricePerDay: 500, pricePerWeek: 2200, depositAmount: 1500,
      images: [IMGS.mixer, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 220,
    },
    {
      title: "Floor Sanding Machine (Drum Sander)",
      description: "Professional drum floor sander for hardwood, parquet and engineered-timber floors. Includes 10 sheets each of 24, 40, 60 and 80 grit. Edge sander also available.",
      pricePerDay: 320, pricePerWeek: 1400, depositAmount: 800,
      images: [IMGS.grinder, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },

    // ── Roofing & Height Work ──────────────────────────────────────────────────
    {
      title: "Roof Safety Harness & Lanyard Kit",
      description: "Full-body harness, 2m shock-absorbing lanyard, roof anchor strap and gear bag. EN 361 and EN 354 certified. Mandatory for work at height above 2m.",
      pricePerDay: 80, pricePerWeek: 360, depositAmount: 200,
      images: [IMGS.scaffold, IMGS.ladder],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 40,
    },
    {
      title: "Roofing Nail Gun (Coil Nailer)",
      description: "Pneumatic coil roofing nailer for IBR, corrugated iron and timber battens. 16–19mm nails, 120-nail magazine, depth-of-drive adjustment. Requires air compressor.",
      pricePerDay: 160, pricePerWeek: 720, depositAmount: 500,
      images: [IMGS.drill, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 70,
    },
    {
      title: "Pipe Bender Manual 15–22mm",
      description: "Manual conduit and pipe bender for 15mm and 22mm copper/steel pipe. Produces accurate 0–180° bends without kinking. Plumbing and electrical conduit use.",
      pricePerDay: 70, pricePerWeek: 310, depositAmount: 150,
      images: [IMGS.drill, IMGS.grinder],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 40,
    },

    // ── Excavation & Trenching ────────────────────────────────────────────────
    {
      title: "Mini Excavator 1.5T (with Operator)",
      description: "1.5-tonne rubber-tracked mini excavator with 300mm and 600mm buckets. Operator included. Ideal for trenching, swimming pools, footings and landscaping.",
      pricePerDay: 4500, pricePerWeek: 20000, depositAmount: 8000,
      images: [IMGS.site, IMGS.compactor],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 80, deliveryFee: 2000,
    },
    {
      title: "Trenching Machine (Chain Trencher) 600mm",
      description: "Petrol walk-behind chain trencher, 100–600mm depth, 100mm wide. Perfect for irrigation pipes, electrical conduit and drainage lines. Markings included.",
      pricePerDay: 700, pricePerWeek: 3200, depositAmount: 2000,
      images: [IMGS.compactor, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 300,
    },
    {
      title: "Earth Auger Petrol 200mm Bit",
      description: "Petrol-powered earth auger with 200mm bit for post holes, palisade fencing, trees and soil testing. 63cc engine. Additional 100mm and 300mm bits available.",
      pricePerDay: 280, pricePerWeek: 1250, depositAmount: 700,
      images: [IMGS.drill, IMGS.compactor],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 120,
    },

    // ── Cleaning & Finishing ──────────────────────────────────────────────────
    {
      title: "Pressure Washer 3000 PSI Petrol",
      description: "Petrol-powered 3000 PSI pressure washer for heavy-duty site cleaning: shutterboard, plant, vehicles and concrete surfaces. 20m hose, turbo nozzle and detergent injector.",
      pricePerDay: 350, pricePerWeek: 1600, depositAmount: 1000,
      images: [IMGS.generator, IMGS.site],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 150,
    },
    {
      title: "Industrial Wet/Dry Vacuum 80L",
      description: "80L industrial vacuum for post-construction clean-up: dust, water and rubble. HEPA filter, 3000W motor, 10m hose, crevice and floor nozzles included.",
      pricePerDay: 180, pricePerWeek: 820, depositAmount: 500,
      images: [IMGS.grinder, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Airless Paint Sprayer 3000 PSI",
      description: "Professional airless sprayer for primers, paints and bituminous coatings. 3.8L/min flow, 30m hose, 3 tip sizes. Cover 500m² of wall per day. For site use.",
      pricePerDay: 420, pricePerWeek: 1900, depositAmount: 1200,
      images: [IMGS.grinder, IMGS.scaffold],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 150,
    },

    // ── Site Safety & Ancillary ───────────────────────────────────────────────
    {
      title: "Traffic Cone Set (20 × 750mm)",
      description: "Set of 20 × 750mm reflective traffic cones for site delineation and road works. Suitable for construction zones, parking and event management.",
      pricePerDay: 60, pricePerWeek: 270, depositAmount: 100,
      images: [IMGS.site, IMGS.scaffold],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 80,
    },
    {
      title: "Builder's Site Toilet (Porta-Loo)",
      description: "Self-contained chemical site toilet meeting OHS Act requirements. Includes waste tank, toilet paper and hand-sanitiser holder. Weekly servicing available extra.",
      pricePerDay: 120, pricePerWeek: 550, depositAmount: 300,
      images: [IMGS.site, IMGS.generator],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 35, deliveryFee: 200,
    },
    {
      title: "Temporary Site Fencing (50m Panel Set)",
      description: "50m of interlocking 2.1m × 3.4m temporary site-security panels with feet and clamps. Deters unauthorised access and meets OHS boundary requirements.",
      pricePerDay: 400, pricePerWeek: 1800, depositAmount: 1000,
      images: [IMGS.scaffold, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 350,
    },
    {
      title: "Construction Site Lighting Tower",
      description: "4-head 2000W metal halide lighting tower on telescopic mast (7m). Petrol generator integrated, 8hr tank. Covers 2500m² of site at 50 lux. Night work ready.",
      pricePerDay: 650, pricePerWeek: 2900, depositAmount: 2000,
      images: [IMGS.generator, IMGS.scaffold],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 300,
    },
    {
      title: "LED Site Floodlight 200W (Set of 4)",
      description: "Set of 4 × 200W LED work lights on adjustable stands. 20 000 lm each, IP65 waterproof, 5m power cable. Ideal for indoor and outdoor night construction.",
      pricePerDay: 280, pricePerWeek: 1250, depositAmount: 600,
      images: [IMGS.generator, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 120,
    },

    // ── Specialised / Niche ───────────────────────────────────────────────────
    {
      title: "Rebar Bender & Cutter Manual",
      description: "Manual rebar bender/cutter for 6–16mm high-tensile bars. Bends to 0–180°, cuts with lever action. No power required — ideal for remote sites.",
      pricePerDay: 140, pricePerWeek: 630, depositAmount: 400,
      images: [IMGS.welder, IMGS.site],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Electric Rebar Cutter 32mm",
      description: "Electric rebar cutter for R16–R32 bars. 3-second cut cycle, 32mm max diameter. Portable and lightweight (4.5kg). Ideal for large slab reinforcement work.",
      pricePerDay: 220, pricePerWeek: 990, depositAmount: 600,
      images: [IMGS.welder, IMGS.drill],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 90,
    },
    {
      title: "Pipe Threading Machine ½\"–2\"",
      description: "Electric pipe threading machine for ½\" to 2\" BSP mild steel pipe. Die sets for ½\", ¾\", 1\" and 1½\" included. For plumbing and fire-protection installations.",
      pricePerDay: 300, pricePerWeek: 1350, depositAmount: 900,
      images: [IMGS.drill, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },
    {
      title: "Drain Camera Inspection System",
      description: "30m self-levelling drain inspection camera with 512Hz sonde, DVR recorder and 7\" LCD monitor. For CCTV surveys, blockage location and pre-purchase inspections.",
      pricePerDay: 700, pricePerWeek: 3100, depositAmount: 2500,
      images: [IMGS.drill, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },
    {
      title: "Metal Detector (Underground Cable & Pipe)",
      description: "Professional cable and pipe locator for detecting buried services before excavation. Active and passive modes, frequency sweep, depth reading to 3m.",
      pricePerDay: 350, pricePerWeek: 1580, depositAmount: 1000,
      images: [IMGS.site, IMGS.drill],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Moisture Meter & Damp Probe Kit",
      description: "Professional pin and pinless moisture meter for concrete, plaster and timber. Includes deep-wall probe and thermal camera adapter. For pre-paint and building inspections.",
      pricePerDay: 150, pricePerWeek: 680, depositAmount: 300,
      images: [IMGS.site, IMGS.drill],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Thermal Imaging Camera (Flir E6)",
      description: "FLIR E6 Pro thermal camera for detecting heat loss, moisture ingress, electrical hot spots and underfloor heating faults. 240×180 IR resolution, MSX enhancement.",
      pricePerDay: 600, pricePerWeek: 2700, depositAmount: 3000,
      images: [IMGS.site, IMGS.scaffold],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: false,
    },

    // ── Hand Tools / Site Sets ────────────────────────────────────────────────
    {
      title: "Brick Laying Tool Kit (20-Piece)",
      description: "Complete bricklaying set: trowels (large & small), jointing tool, bolster chisels, club hammer, spirit level, line pins and pins. In a canvas roll bag.",
      pricePerDay: 70, pricePerWeek: 310, depositAmount: 150,
      images: [IMGS.site, IMGS.mixer],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 50,
    },
    {
      title: "Plasterer's Tool Set (12-Piece)",
      description: "Professional plastering set: rectangular floats, rounded trowels, corner bead trowels, hawk, feather-edge rule and bucket trowel. Ideal for internal and external work.",
      pricePerDay: 75, pricePerWeek: 340, depositAmount: 180,
      images: [IMGS.site, IMGS.mixer],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 50,
    },
    {
      title: "Concrete Finishing Tool Set (8-Piece)",
      description: "Set of 8 concrete finishing tools: bull float, hand float, edger, groover, walkboard and two trowels. Aluminium handles. For freshly poured slabs and paths.",
      pricePerDay: 80, pricePerWeek: 360, depositAmount: 200,
      images: [IMGS.mixer, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Breaker Bar / Demolition Crowbar Set",
      description: "Set of 3 steel crowbars (600mm, 900mm, 1200mm) and a 5kg club hammer for demolition, formwork stripping and heavy-duty prying. Rubber grip handles.",
      pricePerDay: 60, pricePerWeek: 270, depositAmount: 120,
      images: [IMGS.site, IMGS.grinder],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 40,
    },
    {
      title: "Pipe Wrench Set (14\" + 18\" + 24\")",
      description: "Heavy-duty Ridgid pipe wrench set: 14\", 18\" and 24\". For threaded pipe connections, valves and heavy fittings. Ideal for plumbing and mechanical installations.",
      pricePerDay: 90, pricePerWeek: 400, depositAmount: 250,
      images: [IMGS.drill, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 40,
    },

    // ── Finishing the 100 ─────────────────────────────────────────────────────
    {
      title: "Brick Hammer & Bolster Set",
      description: "2kg brick hammer with 4 bolster chisels (50mm, 75mm, 100mm, curved). For splitting bricks, removing old tiles and chasing walls for conduit.",
      pricePerDay: 40, pricePerWeek: 180, depositAmount: 80,
      images: [IMGS.site, IMGS.mixer],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 30,
    },
    {
      title: "Scaffolding Swivel & Fixed Couplers (Box of 50)",
      description: "Box of 50 galvanised scaffolding couplers: 25 swivel and 25 fixed. Compatible with 48.3mm OD tube. For custom scaffold configurations and propping.",
      pricePerDay: 90, pricePerWeek: 400, depositAmount: 200,
      images: [IMGS.scaffold, IMGS.site],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 60,
    },
    {
      title: "Folding Work Platform (Sawhorse Set of 2)",
      description: "Set of two heavy-duty folding sawhorses, 450kg combined load. Adjustable height 700mm–900mm. For supporting doors, plywood and cutting tasks on site.",
      pricePerDay: 50, pricePerWeek: 220, depositAmount: 100,
      images: [IMGS.scaffold, IMGS.saw],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 40,
    },
    {
      title: "Paint Spray Booth Tent 3m × 3m",
      description: "Portable spray booth tent, 3m × 3m × 2.5m, with filter walls, zippered access and LED strip lighting. Keep overspray contained on renovation and joinery projects.",
      pricePerDay: 180, pricePerWeek: 820, depositAmount: 400,
      images: [IMGS.scaffold, IMGS.site],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 100,
    },
    {
      title: "Knee Pad & Elbow Pad Set (6 Pack)",
      description: "Professional gel knee and elbow pads for tile layers, floor layers and roofers. Adjustable straps, puncture-resistant shell. Set of 3 pairs. Cleaned after each rental.",
      pricePerDay: 25, pricePerWeek: 110, depositAmount: 50,
      images: [IMGS.site, IMGS.scaffold],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 10, deliveryFee: 30,
    },
    {
      title: "Cable Pull / Fish Tape 30m",
      description: "30m fibreglass fish tape for pulling electrical cables through conduit, cavities and ceiling voids. Case with guide hook and pull attachment included.",
      pricePerDay: 45, pricePerWeek: 200, depositAmount: 100,
      images: [IMGS.drill, IMGS.site],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 30,
    },
    {
      title: "Heavy-Duty Tarpaulin Set (4 × 6m, Pack of 3)",
      description: "Pack of three 4m × 6m heavy-duty 200gsm poly tarpaulins for covering materials, weatherproofing incomplete structures and dust containment on site.",
      pricePerDay: 60, pricePerWeek: 270, depositAmount: 100,
      images: [IMGS.site, IMGS.scaffold],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 50,
    },
    {
      title: "Surveyor's Measuring Wheel",
      description: "Telescopic surveyor's measuring wheel, 0–9999.9m range, ±0.5% accuracy. Folds flat for transport. Perfect for site set-out, quantity take-offs and insurance assessments.",
      pricePerDay: 55, pricePerWeek: 240, depositAmount: 100,
      images: [IMGS.site, IMGS.ladder],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 40,
    },
    {
      title: "First Aid Kit (SANS 10400-T Site Kit)",
      description: "Compliant SANS 10400-T site first-aid kit for up to 10 workers. Hard case, full contents checklist, eyewash station, burn dressings and CPR mask. OHS compliant.",
      pricePerDay: 35, pricePerWeek: 155, depositAmount: 80,
      images: [IMGS.site, IMGS.generator],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 30,
    },
    {
      title: "Builders' Transit Mixer Barrow",
      description: "Motorised wheelbarrow with 100L drum, petrol engine and powered mixing paddle. Mixes and transports mortar and concrete to the pour point. No shovel needed.",
      pricePerDay: 300, pricePerWeek: 1350, depositAmount: 800,
      images: [IMGS.mixer, IMGS.compactor],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 150,
    },
    {
      title: "Concrete Block Splitter",
      description: "Manual hydraulic block splitter for splitting standard and maxi bricks without dust. 30-tonne splitting force, 400mm jaw. Ideal for paving, walling and retaining walls.",
      pricePerDay: 160, pricePerWeek: 720, depositAmount: 400,
      images: [IMGS.site, IMGS.compactor],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      title: "Needle Scaler / Rust Remover",
      description: "Pneumatic needle scaler for removing rust, mill scale and old paint from steel surfaces. 19-pin bundle, 3000 BPM. Requires air compressor (min 6 bar).",
      pricePerDay: 100, pricePerWeek: 450, depositAmount: 250,
      images: [IMGS.grinder, IMGS.welder],
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 50,
    },
    {
      title: "Gutter Cleaning Kit with Pressure Lance",
      description: "10m telescopic gutter cleaning kit with 270° rotating nozzle, compatible with standard pressure washers. Clean gutters from ground level safely without a ladder.",
      pricePerDay: 65, pricePerWeek: 290, depositAmount: 150,
      images: [IMGS.ladder, IMGS.scaffold],
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 40,
    },
    {
      title: "Hydraulic Pipe Press Tool Kit 16–63mm",
      description: "Cordless hydraulic press tool for ProPress and M-Press copper and stainless fittings, 16–63mm. Includes jaw set and carrying case. For plumbing and HVAC installations.",
      pricePerDay: 480, pricePerWeek: 2150, depositAmount: 1500,
      images: [IMGS.drill, IMGS.site],
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: false,
    },
    {
      title: "Walk-Behind Concrete Saw 350mm",
      description: "Petrol walk-behind concrete saw with 350mm diamond blade for cutting slabs, curbs and asphalt. Water-cooled, depth up to 125mm. Great for expansion joints and roadworks.",
      pricePerDay: 600, pricePerWeek: 2700, depositAmount: 2000,
      images: [IMGS.saw, IMGS.site],
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 250,
    },
    {
      title: "Cable Drum Reel Trolley (500kg)",
      description: "Heavy-duty steel cable drum trolley with spindle sizes 40–90mm diameter. Holds drums up to 500kg. Saves time and prevents cable kinking on large electrical installations.",
      pricePerDay: 80, pricePerWeek: 360, depositAmount: 200,
      images: [IMGS.site, IMGS.generator],
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },
    {
      title: "Portable Site Office / Storage Container 6m",
      description: "6m anti-vandal site container for use as a site office or secure material store. Fitted with desk, shelf, lockable door and 2 windows. Delivery and collection included.",
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 1000,
      images: [IMGS.site, IMGS.generator],
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: true, deliveryRadius: 50, deliveryFee: 800,
    },
  ];

  console.log(`  Creating ${listings.length} construction listings…`);

  let created = 0;
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    const { deliveryAvailable, deliveryRadius, deliveryFee, ...rest } = l as any;
    await db.listing.create({
      data: {
        ...rest,
        category: "TOOLS_EQUIPMENT" as const,
        isAvailable: true,
        ownerId: owner(i).id,
        deliveryAvailable: deliveryAvailable ?? false,
        ...(deliveryRadius != null ? { deliveryRadius } : {}),
        ...(deliveryFee    != null ? { deliveryFee }    : {}),
      },
    });
    created++;
  }

  console.log(`  ✓  ${created} construction listings created`);
  console.log("\n✅  Done!\n");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
