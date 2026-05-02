import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱  Seeding database…");

  const PASSWORD = await bcrypt.hash("Test1234!", 10);

  // ── Users ──────────────────────────────────────────────────────────────────

  const users = await Promise.all([
    db.user.upsert({
      where: { email: "thabo.molefe@test.com" },
      update: {},
      create: {
        email: "thabo.molefe@test.com",
        name: "Thabo",
        surname: "Molefe",
        idNumber: "8501015001081",
        password: PASSWORD,
      },
    }),
    db.user.upsert({
      where: { email: "sarah.vdberg@test.com" },
      update: {},
      create: {
        email: "sarah.vdberg@test.com",
        name: "Sarah",
        surname: "van der Berg",
        idNumber: "9207220024083",
        password: PASSWORD,
      },
    }),
    db.user.upsert({
      where: { email: "sipho.dlamini@test.com" },
      update: {},
      create: {
        email: "sipho.dlamini@test.com",
        name: "Sipho",
        surname: "Dlamini",
        idNumber: "8812085006087",
        password: PASSWORD,
      },
    }),
    db.user.upsert({
      where: { email: "priya.naidoo@test.com" },
      update: {},
      create: {
        email: "priya.naidoo@test.com",
        name: "Priya",
        surname: "Naidoo",
        idNumber: "9503160043089",
        password: PASSWORD,
      },
    }),
    db.user.upsert({
      where: { email: "james.pretorius@test.com" },
      update: {},
      create: {
        email: "james.pretorius@test.com",
        name: "James",
        surname: "Pretorius",
        idNumber: "8704095003083",
        password: PASSWORD,
      },
    }),
    db.user.upsert({
      where: { email: "nomsa.khumalo@test.com" },
      update: {},
      create: {
        email: "nomsa.khumalo@test.com",
        name: "Nomsa",
        surname: "Khumalo",
        idNumber: "9110250067081",
        password: PASSWORD,
      },
    }),
  ]);

  const [thabo, sarah, sipho, priya, james, nomsa] = users;
  console.log(`  ✓  ${users.length} users`);

  // ── Listings ────────────────────────────────────────────────────────────────

  const listings = [
    // Thabo — tools & equipment
    {
      ownerId: thabo.id,
      title: "DeWalt 20V Cordless Drill Set",
      description: "Heavy-duty cordless drill kit with two batteries, charger and carry case. Perfect for DIY and light construction work. Includes 15-piece bit set.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1581147036324-c47a03a81d48?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 150,
      pricePerWeek: 750,
      depositAmount: 500,
      isAvailable: true,
      address: "14 Voortrekker Road",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2001",
      deliveryAvailable: true,
      deliveryRadius: 20,
      deliveryFee: 80,
    },
    {
      ownerId: thabo.id,
      title: "Bosch Angle Grinder 230mm",
      description: "Professional grade angle grinder, 2200W motor. Suitable for cutting and grinding metal, tiles and masonry. Includes 5 cutting discs and safety guard.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 120,
      pricePerWeek: 600,
      depositAmount: 400,
      isAvailable: true,
      address: "14 Voortrekker Road",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2001",
      deliveryAvailable: false,
    },
    {
      ownerId: thabo.id,
      title: "Pressure Washer 2000 PSI",
      description: "High-pressure washer for driveways, patios, vehicles and outdoor furniture. 20m hose included. Great for deep cleaning before events or renovations.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7c6a?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 200,
      pricePerWeek: 900,
      depositAmount: 600,
      isAvailable: true,
      address: "14 Voortrekker Road",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2001",
      deliveryAvailable: true,
      deliveryRadius: 15,
      deliveryFee: 100,
    },

    // Sarah — electronics
    {
      ownerId: sarah.id,
      title: "Sony A7 III Mirrorless Camera",
      description: "Full-frame mirrorless camera with 24-70mm f/2.8 lens, extra battery, 64GB card and camera bag. Great for events, travel photography and videography.",
      category: "CAMERAS_PHOTOGRAPHY" as const,
      images: [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1502920917128-1aa671e9c9cc?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1542567455-1fb9a61783b4?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 450,
      pricePerWeek: 2200,
      pricePerMonth: 7500,
      depositAmount: 3000,
      isAvailable: true,
      address: "8 Beach Road",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      deliveryAvailable: true,
      deliveryRadius: 25,
      deliveryFee: 120,
    },
    {
      ownerId: sarah.id,
      title: "DJI Mini 3 Pro Drone",
      description: "Compact 4K drone with obstacle avoidance and 34-min flight time. Includes Fly More combo: 3 batteries, charging hub and shoulder bag. SACAA registered.",
      category: "CAMERAS_PHOTOGRAPHY" as const,
      images: [
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1508614999368-9260051292e5?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1527977966861-8ae994fd9e38?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 500,
      pricePerWeek: 2500,
      depositAmount: 4000,
      isAvailable: true,
      address: "8 Beach Road",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      deliveryAvailable: false,
    },
    {
      ownerId: sarah.id,
      title: "Epson EH-TW7100 4K Projector",
      description: "3LCD laser projector, 3000 lumens, supports 4K HDR. Comes with HDMI cables, remote and carry bag. Ideal for presentations, movie nights and events.",
      category: "ELECTRONICS" as const,
      images: [
        "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 350,
      pricePerWeek: 1600,
      depositAmount: 2500,
      isAvailable: true,
      address: "8 Beach Road",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      deliveryAvailable: true,
      deliveryRadius: 30,
      deliveryFee: 150,
    },

    // Sipho — vehicles
    {
      ownerId: sipho.id,
      title: "Toyota Hiace 14-Seater Bus",
      description: "Well-maintained 2021 Hiace, air-conditioned with USB charging ports. Perfect for group transfers, school outings, corporate events and day trips.",
      category: "VEHICLES" as const,
      images: [
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e8e0?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1570125901328-9f23a2ba85a8?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 900,
      pricePerWeek: 5000,
      depositAmount: 2000,
      isAvailable: true,
      address: "32 Commissioner Street",
      city: "Durban",
      province: "KwaZulu-Natal",
      postalCode: "4001",
      deliveryAvailable: false,
    },
    {
      ownerId: sipho.id,
      title: "Toyota LDV 1-Ton Bakkie",
      description: "2020 single-cab LDV bakkie, canopy included. Load capacity 1000kg. Licensed for commercial use. Fuel not included. Driver's licence required.",
      category: "VEHICLES" as const,
      images: [
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 500,
      pricePerWeek: 2500,
      depositAmount: 1500,
      isAvailable: true,
      address: "32 Commissioner Street",
      city: "Durban",
      province: "KwaZulu-Natal",
      postalCode: "4001",
      deliveryAvailable: false,
    },

    // Priya — sports & outdoors
    {
      ownerId: priya.id,
      title: "Coleman 6-Person Camping Tent",
      description: "Weatherproof family tent with two rooms, blackout sleeping area and front canopy. Includes carry bag and groundsheet. Setup takes about 15 minutes.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1478131143081-80a7f947af91?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1537905569824-f89b14371a5e?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 180,
      pricePerWeek: 900,
      depositAmount: 400,
      isAvailable: true,
      address: "5 Umgeni Road",
      city: "Durban",
      province: "KwaZulu-Natal",
      postalCode: "4051",
      deliveryAvailable: true,
      deliveryRadius: 20,
      deliveryFee: 60,
    },
    {
      ownerId: priya.id,
      title: "Stand-Up Paddleboard (SUP) Set",
      description: "Inflatable 10'6\" SUP with paddle, leash, pump and backpack. Suitable for beginners and intermediate paddlers. Great for flatwater, rivers and ocean.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1530870110042-98b2cb110834?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1560707303-4e980ce93702?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 250,
      pricePerWeek: 1200,
      depositAmount: 800,
      isAvailable: true,
      address: "5 Umgeni Road",
      city: "Durban",
      province: "KwaZulu-Natal",
      postalCode: "4051",
      deliveryAvailable: false,
    },
    {
      ownerId: priya.id,
      title: "Weber Master-Touch Braai",
      description: "57cm Weber charcoal kettle braai in excellent condition. Includes charcoal chimney starter, grill brush and protective cover. Perfect for garden gatherings.",
      category: "FURNITURE_HOME" as const,
      images: [
        "https://images.unsplash.com/photo-1555041469-db61c0001a4d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1555396273-b9b4fdee8a8e?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 150,
      pricePerWeek: 700,
      depositAmount: 300,
      isAvailable: true,
      address: "5 Umgeni Road",
      city: "Durban",
      province: "KwaZulu-Natal",
      postalCode: "4051",
      deliveryAvailable: true,
      deliveryRadius: 10,
      deliveryFee: 50,
    },

    // James — party & events
    {
      ownerId: james.id,
      title: "PA Sound System (2000W)",
      description: "Pair of active 15\" speakers, subwoofer, 8-channel mixer and all cables. Handles up to 150 guests. Great for parties, weddings, corporate events and markets.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1571974599782-87624638275c?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 600,
      pricePerWeek: 2800,
      depositAmount: 2000,
      isAvailable: true,
      address: "22 Jorissen Street",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2017",
      deliveryAvailable: true,
      deliveryRadius: 40,
      deliveryFee: 200,
    },
    {
      ownerId: james.id,
      title: "Marquee Tent 6m × 9m",
      description: "White frame marquee with sidewalls, two doors and 6 windows. Comfortably seats 60 guests. Professional aluminium frame. Setup assistance available at extra cost.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1519671282749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1464366400600-ac2779fba5f7?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 800,
      pricePerWeek: 4000,
      depositAmount: 2500,
      isAvailable: true,
      address: "22 Jorissen Street",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2017",
      deliveryAvailable: true,
      deliveryRadius: 50,
      deliveryFee: 300,
    },

    // ── Extra listings ─────────────────────────────────────────────────────────

    // Thabo — more tools
    {
      ownerId: thabo.id,
      title: "Makita Circular Saw 185mm",
      description: "Powerful 1200W circular saw with tungsten carbide blade, parallel guide and dust blower. Ideal for cutting timber, plywood and MDF. Case included.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 130, pricePerWeek: 650, depositAmount: 450,
      isAvailable: true,
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 80,
    },
    {
      ownerId: thabo.id,
      title: "Extension Ladder 8m Aluminium",
      description: "Lightweight 8-metre aluminium extension ladder with non-slip feet and stabiliser bar. Load rating 150kg. Ideal for gutters, painting and roofing jobs.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 100, pricePerWeek: 480, depositAmount: 300,
      isAvailable: true,
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: false,
    },
    {
      ownerId: thabo.id,
      title: "Concrete Mixer 140L",
      description: "Electric 140-litre drum mixer, 0.5HP motor. Perfect for small-to-medium building projects. Weighs 70kg — delivery to site recommended. Extension cord included.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 700,
      isAvailable: true,
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 150,
    },
    {
      ownerId: thabo.id,
      title: "Petrol Generator 3.5KVA",
      description: "Reliable 3.5KVA petrol generator with two 230V outlets and one USB port. Runs ~8 hours on a full tank. Great for load-shedding, camping and construction sites.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1590725121172-6ec66d8e7a6c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1504328345951-4a801c74e8f8?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 350, pricePerWeek: 1600, depositAmount: 1000,
      isAvailable: true,
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 30, deliveryFee: 200,
    },

    // Sarah — more cameras & electronics
    {
      ownerId: sarah.id,
      title: "DJI RS 3 Pro Gimbal Stabilizer",
      description: "3-axis motorised gimbal for DSLR and mirrorless cameras up to 4.5kg. Includes carry case, focus motor and Ronin app integration. Buttery-smooth footage guaranteed.",
      category: "CAMERAS_PHOTOGRAPHY" as const,
      images: [
        "https://images.unsplash.com/photo-1611162617213-7d7b6b9e4c2a?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 280, pricePerWeek: 1300, depositAmount: 2000,
      isAvailable: true,
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 100,
    },
    {
      ownerId: sarah.id,
      title: "Studio Lighting Kit (3-Point)",
      description: "Professional 3-point lighting setup: two 150W softboxes and one 80W background light with stands, reflectors and carry bag. Perfect for portraits and product shoots.",
      category: "CAMERAS_PHOTOGRAPHY" as const,
      images: [
        "https://images.unsplash.com/photo-1551618612-fb5f6f1ca4ec?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1542567455-1fb9a61783b4?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 220, pricePerWeek: 1000, depositAmount: 800,
      isAvailable: true,
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 120,
    },
    {
      ownerId: sarah.id,
      title: "MacBook Pro 16\" M3 (2024)",
      description: "Apple MacBook Pro 16\", M3 Pro chip, 36GB RAM, 512GB SSD. Pre-loaded with Final Cut Pro, Adobe CC and DaVinci Resolve. Charger and USB-C hub included.",
      category: "ELECTRONICS" as const,
      images: [
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 400, pricePerWeek: 2000, depositAmount: 3500,
      isAvailable: true,
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: false,
    },
    {
      ownerId: sarah.id,
      title: "Rode VideoMic Pro+ Microphone",
      description: "Professional on-camera shotgun microphone with integrated Rycote shockmount, built-in rechargeable battery and high-pass filter. Perfect for video and interviews.",
      category: "ELECTRONICS" as const,
      images: [
        "https://images.unsplash.com/photo-1593697820989-13e5e9b2a4b2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 160, pricePerWeek: 750, depositAmount: 600,
      isAvailable: true,
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 80,
    },

    // Sipho — more vehicles
    {
      ownerId: sipho.id,
      title: "Enclosed Car Trailer 3.5m",
      description: "Single-axle enclosed trailer, 3.5m load area, 750kg capacity. Suitable for furniture removals, motorcycles or market stalls. Ball hitch: 50mm. Lights in good order.",
      category: "VEHICLES" as const,
      images: [
        "https://images.unsplash.com/photo-1617839625788-4e1a6a8c7c3d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 300, pricePerWeek: 1400, depositAmount: 800,
      isAvailable: true,
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },
    {
      ownerId: sipho.id,
      title: "Toyota Fortuner 4x4 (2022)",
      description: "2022 Fortuner 2.8GD-6 4x4, 5-speed auto. Seats 7. Perfect for game drives, off-road trips and family adventures. Comes with spare tyre and tow bar. Fuel not included.",
      category: "VEHICLES" as const,
      images: [
        "https://images.unsplash.com/photo-1549317661-cf369843d2e1?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 750, pricePerWeek: 4000, depositAmount: 3000,
      isAvailable: true,
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },
    {
      ownerId: sipho.id,
      title: "Honda CB500F Motorcycle",
      description: "2021 Honda CB500F naked bike, 471cc parallel-twin. 43 000km service history. Helmet and riding gloves included. Code A licence required. Insurance not included.",
      category: "VEHICLES" as const,
      images: [
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7c6a?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e8e0?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 350, pricePerWeek: 1800, depositAmount: 2000,
      isAvailable: true,
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },

    // Priya — more sports & outdoors
    {
      ownerId: priya.id,
      title: "Kayak Double Sea Kayak",
      description: "Sit-on-top tandem kayak, fibreglass hull, includes two paddles, two life vests and dry bag. Suitable for flat water, estuaries and calm coastal conditions.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1517832207153-d3d96ed9c2a4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1530870110042-98b2cb110834?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 320, pricePerWeek: 1500, depositAmount: 1000,
      isAvailable: true,
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 25, deliveryFee: 100,
    },
    {
      ownerId: priya.id,
      title: "Trek Marlin 7 Mountain Bike",
      description: "2023 Trek Marlin 7 hardtail MTB, 29\", medium frame, hydraulic disc brakes and 24-speed drivetrain. Helmet and lock included. Great for trails and commuting.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 200, pricePerWeek: 950, depositAmount: 600,
      isAvailable: true,
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: false,
    },
    {
      ownerId: priya.id,
      title: "Surfboard Longboard 9'2\"",
      description: "Classic 9'2\" longboard with soft-top deck. Great for beginners and noseriders. Comes with ankle leash, fin and board bag. Pick up at Umhlanga beach.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1502680390469-be75c86b66b2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1560707303-4e980ce93702?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 180, pricePerWeek: 850, depositAmount: 500,
      isAvailable: true,
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: false,
    },
    {
      ownerId: priya.id,
      title: "Titleist Golf Club Set (Full Bag)",
      description: "Complete 14-club Titleist set including bag, trolley and 2 dozen Pro V1 balls. Suitable for men's regular flex. Great for visiting golfers or trying the sport.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1535131749584-4a69fa8a4c5c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 220, pricePerWeek: 1000, depositAmount: 700,
      isAvailable: true,
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 60,
    },

    // James — more party & events
    {
      ownerId: james.id,
      title: "LED Dance Floor 4m × 4m",
      description: "Modular RGB LED dance floor, 4m × 4m with 16 panels and DMX controller. Battery or mains powered. Perfect for weddings, club nights and themed events.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1518608774566-5e30c7c4e5ab?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1571974599782-87624638275c?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 1200, pricePerWeek: 5500, depositAmount: 3000,
      isAvailable: true,
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 350,
    },
    {
      ownerId: james.id,
      title: "Photo Booth Kit with Printer",
      description: "Complete DIY photo booth: ring light, 8\" touchscreen tablet, Canon Selphy printer and 200 print credits. Comes with fun props box and fabric backdrop. Great for any event.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519671282429-b8216b3b60a4?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 500, pricePerWeek: 2200, depositAmount: 1500,
      isAvailable: true,
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 35, deliveryFee: 180,
    },
    {
      ownerId: james.id,
      title: "DJ Controller Pioneer DDJ-800",
      description: "Pioneer DDJ-800 2-channel DJ controller with Rekordbox DJ licence. Built-in soundcard, performance pads and filter FX. Includes carry bag and 2× RCA cables.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1571266752-03a38e9e53b7?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 400, pricePerWeek: 1800, depositAmount: 2000,
      isAvailable: true,
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 150,
    },
    {
      ownerId: james.id,
      title: "Popcorn & Candy Floss Machine Combo",
      description: "Stainless steel popcorn maker and candy floss machine bundle. Includes 500g of kernels, 200g of floss sugar and serving bags. Perfect for kids parties and markets.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 200, pricePerWeek: 900, depositAmount: 500,
      isAvailable: true,
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 40, deliveryFee: 120,
    },
    {
      ownerId: james.id,
      title: "120-Piece Banquet Chair Set",
      description: "White plastic banquet chairs with chrome legs and foam seat pads. Stackable, easy to transport. Ideal for weddings, funerals, graduations and outdoor dining.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1464366400600-ac2779fba5f7?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519671282429-b8216b3b60a4?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 600, pricePerWeek: 2800, depositAmount: 1000,
      isAvailable: true,
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 50, deliveryFee: 400,
    },

    // Nomsa — more music & electronics & furniture
    {
      ownerId: nomsa.id,
      title: "Fender Stratocaster Electric Guitar Kit",
      description: "Fender Player Series Strat in 3-colour sunburst, with Fender Blues Junior amp, leads, tuner and plectrum set. Perfect for rehearsals, gigs and lessons.",
      category: "MUSICAL_INSTRUMENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 180, pricePerWeek: 850, depositAmount: 800,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      ownerId: nomsa.id,
      title: "Pearl Export Drum Kit",
      description: "5-piece Pearl Export drum kit in jet black with Sabian cymbals, hardware pack and stool. Suitable for rehearsals and small venues. Delivery to ground floor only.",
      category: "MUSICAL_INSTRUMENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 350, pricePerWeek: 1600, depositAmount: 1200,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 10, deliveryFee: 200,
    },
    {
      ownerId: nomsa.id,
      title: "De'Longhi La Specialista Espresso Machine",
      description: "Prosumer espresso and cappuccino machine with built-in grinder, steam wand and 19-bar pump. Includes knock box, tamper and 500g of coffee beans. Perfect for events.",
      category: "FURNITURE_HOME" as const,
      images: [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 250, pricePerWeek: 1100, depositAmount: 1500,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 100,
    },
    {
      ownerId: nomsa.id,
      title: "Patio Furniture Set (8-Seater)",
      description: "8-seater aluminium outdoor dining set with 2 umbrella holes, weather-resistant cushions and glass-top table. Ideal for garden parties, photo shoots or holiday lets.",
      category: "FURNITURE_HOME" as const,
      images: [
        "https://images.unsplash.com/photo-1558013779-17d7e05c17a6?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1555396273-b9b4fdee8a8e?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 300, pricePerWeek: 1400, depositAmount: 800,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 180,
    },
    {
      ownerId: nomsa.id,
      title: "Nespresso Vertuo Next Coffee Machine",
      description: "Nespresso Vertuo Next with Aeroccino milk frother, 50 mixed capsule starter pack and descaling kit. Great for pop-up cafés, Airbnbs and office events.",
      category: "ELECTRONICS" as const,
      images: [
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 120, pricePerWeek: 550, depositAmount: 400,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },

    // Mixed — additional listings to hit 30+
    {
      ownerId: priya.id,
      title: "Inflatable Hot Tub (6-Person)",
      description: "Lay-Z-Spa Helsinki 6-person inflatable hot tub with 180 airjets and digital control panel. Heats to 40°C. Includes chemical starter kit and cover. Setup takes 20 minutes.",
      category: "FURNITURE_HOME" as const,
      images: [
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1530541804-5a9f78c87b81?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 450, pricePerWeek: 2000, depositAmount: 1000,
      isAvailable: true,
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 200,
    },
    {
      ownerId: james.id,
      title: "Bouncy Castle (5m × 4m)",
      description: "Commercial-grade bouncy castle, 5m × 4m, with safety net sides and blower. Suits ages 3–12. Delivery and setup included within 20km of Johannesburg CBD.",
      category: "PARTY_EVENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519671282429-b8216b3b60a4?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 500, pricePerWeek: 2200, depositAmount: 800,
      isAvailable: true,
      address: "22 Jorissen Street", city: "Johannesburg", province: "Gauteng", postalCode: "2017",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 0,
    },
    {
      ownerId: sipho.id,
      title: "Nissan NV200 Panel Van",
      description: "2020 Nissan NV200 panel van, load area 2.8m × 1.5m, 650kg capacity. Perfect for small removals, courier runs or pop-up stalls. Fuel not included.",
      category: "VEHICLES" as const,
      images: [
        "https://images.unsplash.com/photo-1567593810070-7a3d471af022?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 400, pricePerWeek: 1900, depositAmount: 1200,
      isAvailable: true,
      address: "32 Commissioner Street", city: "Durban", province: "KwaZulu-Natal", postalCode: "4001",
      deliveryAvailable: false,
    },
    {
      ownerId: thabo.id,
      title: "Milwaukee M18 Hammer Drill Set",
      description: "Milwaukee M18 FUEL brushless hammer drill/driver combo with SDS chuck adapter, 2 batteries, charger and contractor bag. For heavy masonry and steel.",
      category: "TOOLS_EQUIPMENT" as const,
      images: [
        "https://images.unsplash.com/photo-1581147036324-c47a03a81d48?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 175, pricePerWeek: 800, depositAmount: 600,
      isAvailable: true,
      address: "14 Voortrekker Road", city: "Johannesburg", province: "Gauteng", postalCode: "2001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      ownerId: nomsa.id,
      title: "Nintendo Switch OLED Bundle",
      description: "Nintendo Switch OLED with dock, Joy-Cons and 10 game cards including Mario Kart, Zelda and Minecraft. Great for holidays, travel and kids parties.",
      category: "GAMES_TOYS" as const,
      images: [
        "https://images.unsplash.com/photo-1585620385456-4759f9b5c7d9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 150, pricePerWeek: 700, depositAmount: 500,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 15, deliveryFee: 50,
    },
    {
      ownerId: sarah.id,
      title: "Oculus Quest 3 VR Headset",
      description: "Meta Quest 3 VR headset with 2 controllers, charging dock and 15 game titles. Standalone — no PC required. Great for team-building events and birthday parties.",
      category: "ELECTRONICS" as const,
      images: [
        "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 300, pricePerWeek: 1400, depositAmount: 1500,
      isAvailable: true,
      address: "8 Beach Road", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 80,
    },
    {
      ownerId: priya.id,
      title: "4-Person Dome Tent Ultralight",
      description: "REI Co-op 4-person ultralight backpacking tent, 1.8kg. Freestanding, double-wall, trekking pole compatible. Quick pitch in under 5 minutes. Footprint included.",
      category: "SPORTS_OUTDOORS" as const,
      images: [
        "https://images.unsplash.com/photo-1478131143081-80a7f947af91?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1537905569824-f89b14371a5e?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 140, pricePerWeek: 650, depositAmount: 400,
      isAvailable: true,
      address: "5 Umgeni Road", city: "Durban", province: "KwaZulu-Natal", postalCode: "4051",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },

    // Nomsa — books & media
    {
      ownerId: nomsa.id,
      title: "Architecture Book Collection (50+ Titles)",
      description: "50+ architecture, interior design and urban planning titles including Phaidon classics. Ideal for students, designers and researchers. Collected over 10 years.",
      category: "BOOKS_MEDIA" as const,
      images: [
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 80, pricePerWeek: 350, depositAmount: 200,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 10, deliveryFee: 40,
    },

    // Nomsa — clothing
    {
      ownerId: nomsa.id,
      title: "Traditional Xhosa Umbhaco Outfit (Women's M)",
      description: "Full traditional Xhosa umbhaco dress, doek and beaded necklace set in size medium. Professionally cleaned and stored. Perfect for graduations, heritage events and shoots.",
      category: "CLOTHING_ACCESSORIES" as const,
      images: [
        "https://images.unsplash.com/photo-1594938298603-c8148c4b4e85?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 120, pricePerWeek: 550, depositAmount: 300,
      isAvailable: true,
      address: "67 Long Street", city: "Cape Town", province: "Western Cape", postalCode: "8001",
      deliveryAvailable: true, deliveryRadius: 20, deliveryFee: 60,
    },

    // Nomsa — books & media
    {
      ownerId: nomsa.id,
      title: "Yamaha P-125 Digital Piano",
      description: "88-key weighted digital piano with stand, sustain pedal and headphones. Excellent for practice, lessons and small performances. Transport bag included.",
      category: "MUSICAL_INSTRUMENTS" as const,
      images: [
        "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 200,
      pricePerWeek: 950,
      pricePerMonth: 3200,
      depositAmount: 1000,
      isAvailable: true,
      address: "67 Long Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      deliveryAvailable: true,
      deliveryRadius: 20,
      deliveryFee: 100,
    },
    {
      ownerId: nomsa.id,
      title: "Canon PIXMA Pro-200 Photo Printer",
      description: "A3+ professional photo printer, supports borderless printing up to 33×48cm. All ink cartridges included. Ideal for photographers and designers needing print runs.",
      category: "ELECTRONICS" as const,
      images: [
        "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1563461660947-507ef49e9c47?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1586953208448-b90a07a46b78?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerDay: 280,
      pricePerWeek: 1300,
      depositAmount: 1500,
      isAvailable: true,
      address: "67 Long Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      deliveryAvailable: false,
    },
  ];

  let created = 0;
  for (const listing of listings) {
    const { deliveryAvailable, deliveryRadius, deliveryFee, ...rest } = listing as any;
    await db.listing.create({
      data: {
        ...rest,
        deliveryAvailable: deliveryAvailable ?? false,
        ...(deliveryRadius != null ? { deliveryRadius } : {}),
        ...(deliveryFee    != null ? { deliveryFee }    : {}),
      },
    });
    created++;
  }
  console.log(`  ✓  ${created} listings`);

  // ── Sample bookings ─────────────────────────────────────────────────────────

  const allListings = await db.listing.findMany({
    where: { ownerId: { in: [thabo.id, sarah.id, sipho.id, priya.id, james.id, nomsa.id] } },
    select: { id: true, ownerId: true, pricePerDay: true, title: true },
  });

  const byOwner = (ownerId: string) => allListings.filter((l) => l.ownerId === ownerId);

  const bookingSeed = [
    {
      listing: byOwner(thabo.id)[0],
      borrowerId: james.id,
      startDate: new Date("2026-05-05"),
      endDate:   new Date("2026-05-08"),
      status: "CONFIRMED" as const,
    },
    {
      listing: byOwner(sarah.id)[0],
      borrowerId: priya.id,
      startDate: new Date("2026-05-10"),
      endDate:   new Date("2026-05-12"),
      status: "PENDING" as const,
    },
    {
      listing: byOwner(sipho.id)[0],
      borrowerId: nomsa.id,
      startDate: new Date("2026-04-20"),
      endDate:   new Date("2026-04-22"),
      status: "COMPLETED" as const,
    },
    {
      listing: byOwner(james.id)[0],
      borrowerId: thabo.id,
      startDate: new Date("2026-05-15"),
      endDate:   new Date("2026-05-16"),
      status: "PENDING" as const,
    },
    {
      listing: byOwner(priya.id)[0],
      borrowerId: sarah.id,
      startDate: new Date("2026-05-20"),
      endDate:   new Date("2026-05-25"),
      status: "CONFIRMED" as const,
    },
  ];

  const createdBookings: any[] = [];
  for (const b of bookingSeed) {
    if (!b.listing) continue;
    const days = Math.ceil((b.endDate.getTime() - b.startDate.getTime()) / 86_400_000);
    const booking = await db.booking.create({
      data: {
        listingId:    b.listing.id,
        borrowerId:   b.borrowerId,
        startDate:    b.startDate,
        endDate:      b.endDate,
        totalAmount:  b.listing.pricePerDay * days,
        status:       b.status,
      },
    });
    createdBookings.push({ ...booking, listing: b.listing });
  }
  console.log(`  ✓  ${createdBookings.length} bookings`);

  // ── Sample message threads ──────────────────────────────────────────────────

  const threads = [
    {
      booking: createdBookings[0],
      messages: [
        { senderId: james.id,  body: "Hi Thabo! Just confirming the drill set is still available for next week?" },
        { senderId: thabo.id,  body: "Hi James, yes it's all yours! I'll make sure the batteries are fully charged." },
        { senderId: james.id,  body: "Perfect, thanks. Should I collect from your address in Voortrekker Road?" },
        { senderId: thabo.id,  body: "Yes, any time after 8am works for me. I'll leave it at the gate if I'm not home." },
      ],
    },
    {
      booking: createdBookings[1],
      messages: [
        { senderId: priya.id,  body: "Hi Sarah, I'd love to hire the Sony A7 III for a family portrait session on the 10th." },
        { senderId: sarah.id,  body: "Hi Priya! Great choice. The kit includes the 24-70mm which is perfect for portraits." },
        { senderId: priya.id,  body: "Wonderful. Does it come with a memory card?" },
        { senderId: sarah.id,  body: "Yes, I include a 64GB card. I'll also throw in a UV filter for the lens." },
        { senderId: priya.id,  body: "Amazing, thank you so much!" },
      ],
    },
    {
      booking: createdBookings[2],
      messages: [
        { senderId: nomsa.id,  body: "Sipho, the bus was excellent — really smooth ride and the A/C was great. Thank you!" },
        { senderId: sipho.id,  body: "Glad to hear it, Nomsa! Hope the event went well. Feel free to book again anytime." },
      ],
    },
  ];

  let threadCount = 0;
  let msgCount    = 0;

  for (const t of threads) {
    if (!t.booking) continue;
    const thread = await db.messageThread.create({
      data: {
        bookingId:    t.booking.id,
        subject:      t.booking.listing.title,
        participants: {
          create: [
            { userId: t.booking.borrowerId },
          ],
        },
      },
    });

    // Add the owner as a participant too
    const ownerListing = allListings.find((l) => l.id === t.booking.listingId);
    if (ownerListing) {
      await db.messageThreadParticipant.upsert({
        where: { threadId_userId: { threadId: thread.id, userId: ownerListing.ownerId } },
        update: {},
        create: { threadId: thread.id, userId: ownerListing.ownerId },
      });
    }

    let lastAt = new Date();
    for (const m of t.messages) {
      lastAt = new Date(lastAt.getTime() - Math.random() * 3_600_000);
      await db.message.create({
        data: { threadId: thread.id, senderId: m.senderId, body: m.body, createdAt: lastAt },
      });
      msgCount++;
    }

    await db.messageThread.update({
      where: { id: thread.id },
      data:  { lastMessageAt: lastAt },
    });
    threadCount++;
  }

  console.log(`  ✓  ${threadCount} threads, ${msgCount} messages`);
  console.log("\n✅  Seed complete!\n");
  console.log("Test accounts (password: Test1234!):");
  users.forEach((u) => console.log(`   ${u.email}`));
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
