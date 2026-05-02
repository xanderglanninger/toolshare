import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter } as any);

const Q = "?auto=format&fit=crop&w=1200&q=80";
const U = "https://images.unsplash.com/photo-";

// All IDs below have been verified 200 OK
const FIXES: Record<string, string[]> = {
  // ── Tools ──────────────────────────────────────────────────────────────────
  "DeWalt 20V Cordless Drill Set": [
    `${U}1504148455328-c376907d081c${Q}`,
    `${U}1572981779307-38b8cabb2407${Q}`,
    `${U}1590959651373-a3db0f38a961${Q}`,
  ],
  "Bosch Angle Grinder 230mm": [
    `${U}1590959651373-a3db0f38a961${Q}`,
    `${U}1504148455328-c376907d081c${Q}`,
    `${U}1572981779307-38b8cabb2407${Q}`,
  ],
  "Pressure Washer 2000 PSI": [
    `${U}1558618666-fcd25c85cd64${Q}`,
    `${U}1585771724684-38269d6639fd${Q}`,
    `${U}1581092334651-ddf26d9a09d0${Q}`,
  ],
  "Makita Circular Saw 185mm": [
    `${U}1572981779307-38b8cabb2407${Q}`,
    `${U}1504148455328-c376907d081c${Q}`,
    `${U}1581092334651-ddf26d9a09d0${Q}`,
  ],
  "Extension Ladder 8m Aluminium": [
    `${U}1600585154526-990dced4db0d${Q}`,
    `${U}1581092334651-ddf26d9a09d0${Q}`,
    `${U}1590959651373-a3db0f38a961${Q}`,
  ],
  "Concrete Mixer 140L": [
    `${U}1504917595217-d4dc5ebe6122${Q}`,
    `${U}1581092334651-ddf26d9a09d0${Q}`,
    `${U}1590959651373-a3db0f38a961${Q}`,
  ],
  "Petrol Generator 3.5KVA": [
    `${U}1504917595217-d4dc5ebe6122${Q}`,
    `${U}1590959651373-a3db0f38a961${Q}`,
    `${U}1581092334651-ddf26d9a09d0${Q}`,
  ],
  "Milwaukee M18 Hammer Drill Set": [
    `${U}1572981779307-38b8cabb2407${Q}`,
    `${U}1504148455328-c376907d081c${Q}`,
    `${U}1590959651373-a3db0f38a961${Q}`,
  ],

  // ── Cameras & Photography ──────────────────────────────────────────────────
  "Sony A7 III Mirrorless Camera": [
    `${U}1516035069371-29a1b244cc32${Q}`,
    `${U}1502920917128-1aa671e9c9cc${Q}`,
    `${U}1542567455-1fb9a61783b4${Q}`,
  ],
  "DJI Mini 3 Pro Drone": [
    `${U}1473968512647-3e447244af8f${Q}`,
    `${U}1508614999368-9260051292e5${Q}`,
    `${U}1527977966861-8ae994fd9e38${Q}`,
  ],
  "DJI RS 3 Pro Gimbal Stabilizer": [
    `${U}1516035069371-29a1b244cc32${Q}`,
    `${U}1542567455-1fb9a61783b4${Q}`,
    `${U}1502920917128-1aa671e9c9cc${Q}`,
  ],
  "Studio Lighting Kit (3-Point)": [
    `${U}1502920917128-1aa671e9c9cc${Q}`,
    `${U}1516035069371-29a1b244cc32${Q}`,
    `${U}1542567455-1fb9a61783b4${Q}`,
  ],

  // ── Electronics ────────────────────────────────────────────────────────────
  "Epson EH-TW7100 4K Projector": [
    `${U}1478720568477-152d9b164e26${Q}`,
    `${U}1517604931442-7e0c8ed2963c${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
  ],
  "Canon PIXMA Pro-200 Photo Printer": [
    `${U}1612815154858-60aa4c59eaa6${Q}`,
    `${U}1563461660947-507ef49e9c47${Q}`,
    `${U}1586953208448-b90a07a46b78${Q}`,
  ],
  "MacBook Pro 16\" M3 (2024)": [
    `${U}1496181133206-80ce9b88a853${Q}`,
    `${U}1517336714731-489689fd1ca8${Q}`,
    `${U}1581092334651-ddf26d9a09d0${Q}`,
  ],
  "Rode VideoMic Pro+ Microphone": [
    `${U}1516035069371-29a1b244cc32${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
    `${U}1470225620780-dba8ba36b745${Q}`,
  ],
  "Oculus Quest 3 VR Headset": [
    `${U}1496181133206-80ce9b88a853${Q}`,
    `${U}1517336714731-489689fd1ca8${Q}`,
    `${U}1485965120184-e220f721d03e${Q}`,
  ],
  "Nespresso Vertuo Next Coffee Machine": [
    `${U}1514432324607-a09d9b4aefdd${Q}`,
    `${U}1509042239860-f550ce710b93${Q}`,
    `${U}1495474472287-4d71bcdd2085${Q}`,
  ],

  // ── Vehicles ───────────────────────────────────────────────────────────────
  "Toyota Hiace 14-Seater Bus": [
    `${U}1544636331-e26879cd4d9b${Q}`,
    `${U}1567593810070-7a3d471af022${Q}`,
    `${U}1533473359331-0135ef1b58bf${Q}`,
  ],
  "Toyota LDV 1-Ton Bakkie": [
    `${U}1605559424843-9e4c228bf1c2${Q}`,
    `${U}1533473359331-0135ef1b58bf${Q}`,
    `${U}1567593810070-7a3d471af022${Q}`,
  ],
  "Enclosed Car Trailer 3.5m": [
    `${U}1533473359331-0135ef1b58bf${Q}`,
    `${U}1567593810070-7a3d471af022${Q}`,
    `${U}1605559424843-9e4c228bf1c2${Q}`,
  ],
  "Toyota Fortuner 4x4 (2022)": [
    `${U}1605559424843-9e4c228bf1c2${Q}`,
    `${U}1544636331-e26879cd4d9b${Q}`,
    `${U}1533473359331-0135ef1b58bf${Q}`,
  ],
  "Honda CB500F Motorcycle": [
    `${U}1567593810070-7a3d471af022${Q}`,
    `${U}1605559424843-9e4c228bf1c2${Q}`,
    `${U}1533473359331-0135ef1b58bf${Q}`,
  ],
  "Nissan NV200 Panel Van": [
    `${U}1567593810070-7a3d471af022${Q}`,
    `${U}1544636331-e26879cd4d9b${Q}`,
    `${U}1605559424843-9e4c228bf1c2${Q}`,
  ],

  // ── Sports & Outdoors ──────────────────────────────────────────────────────
  "Coleman 6-Person Camping Tent": [
    `${U}1504280390367-361c6d9f38f4${Q}`,
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
  ],
  "Stand-Up Paddleboard (SUP) Set": [
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
    `${U}1485965120184-e220f721d03e${Q}`,
  ],
  "Kayak Double Sea Kayak": [
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
    `${U}1485965120184-e220f721d03e${Q}`,
  ],
  "Trek Marlin 7 Mountain Bike": [
    `${U}1485965120184-e220f721d03e${Q}`,
    `${U}1571068316344-75bc76f77890${Q}`,
    `${U}1530870110042-98b2cb110834${Q}`,
  ],
  "Surfboard Longboard 9'2\"": [
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
    `${U}1485965120184-e220f721d03e${Q}`,
  ],
  "Titleist Golf Club Set (Full Bag)": [
    `${U}1485965120184-e220f721d03e${Q}`,
    `${U}1571068316344-75bc76f77890${Q}`,
    `${U}1530870110042-98b2cb110834${Q}`,
  ],
  "4-Person Dome Tent Ultralight": [
    `${U}1504280390367-361c6d9f38f4${Q}`,
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
  ],

  // ── Furniture & Home ───────────────────────────────────────────────────────
  "Weber Master-Touch Braai": [
    `${U}1558030006-450675393462${Q}`,
    `${U}1529193591184-b1d58069ecdd${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
  ],
  "De'Longhi La Specialista Espresso Machine": [
    `${U}1495474472287-4d71bcdd2085${Q}`,
    `${U}1509042239860-f550ce710b93${Q}`,
    `${U}1514432324607-a09d9b4aefdd${Q}`,
  ],
  "Patio Furniture Set (8-Seater)": [
    `${U}1529193591184-b1d58069ecdd${Q}`,
    `${U}1558030006-450675393462${Q}`,
    `${U}1511578314322-379afb476865${Q}`,
  ],
  "Inflatable Hot Tub (6-Person)": [
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
    `${U}1529193591184-b1d58069ecdd${Q}`,
  ],

  // ── Party & Events ─────────────────────────────────────────────────────────
  "PA Sound System (2000W)": [
    `${U}1470225620780-dba8ba36b745${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
    `${U}1511578314322-379afb476865${Q}`,
  ],
  "Marquee Tent 6m × 9m": [
    `${U}1511578314322-379afb476865${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
    `${U}1506905925346-21bda4d32df4${Q}`,
  ],
  "LED Dance Floor 4m × 4m": [
    `${U}1493225457124-a3eb161ffa5f${Q}`,
    `${U}1470225620780-dba8ba36b745${Q}`,
    `${U}1511578314322-379afb476865${Q}`,
  ],
  "Photo Booth Kit with Printer": [
    `${U}1506905925346-21bda4d32df4${Q}`,
    `${U}1511578314322-379afb476865${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
  ],
  "DJ Controller Pioneer DDJ-800": [
    `${U}1493676304819-0d7a8d026dcf${Q}`,
    `${U}1470225620780-dba8ba36b745${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
  ],
  "Popcorn & Candy Floss Machine Combo": [
    `${U}1511578314322-379afb476865${Q}`,
    `${U}1506905925346-21bda4d32df4${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
  ],
  "120-Piece Banquet Chair Set": [
    `${U}1511578314322-379afb476865${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
    `${U}1506905925346-21bda4d32df4${Q}`,
  ],
  "Bouncy Castle (5m × 4m)": [
    `${U}1511578314322-379afb476865${Q}`,
    `${U}1506905925346-21bda4d32df4${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
  ],

  // ── Musical Instruments ────────────────────────────────────────────────────
  "Yamaha P-125 Digital Piano": [
    `${U}1520523839897-bd0b52f945a0${Q}`,
    `${U}1507838153414-b4b713384a76${Q}`,
    `${U}1552422535-c45813c61732${Q}`,
  ],
  "Fender Stratocaster Electric Guitar Kit": [
    `${U}1510915361894-db8b60106cb1${Q}`,
    `${U}1507838153414-b4b713384a76${Q}`,
    `${U}1552422535-c45813c61732${Q}`,
  ],
  "Pearl Export Drum Kit": [
    `${U}1519892300165-cb5542fb47c7${Q}`,
    `${U}1510915361894-db8b60106cb1${Q}`,
    `${U}1507838153414-b4b713384a76${Q}`,
  ],

  // ── Clothing & Books ───────────────────────────────────────────────────────
  "Traditional Xhosa Umbhaco Outfit (Women's M)": [
    `${U}1490481651871-ab68de25d43d${Q}`,
    `${U}1512820790803-83ca734da794${Q}`,
    `${U}1511578314322-379afb476865${Q}`,
  ],
  "Architecture Book Collection (50+ Titles)": [
    `${U}1512820790803-83ca734da794${Q}`,
    `${U}1496181133206-80ce9b88a853${Q}`,
    `${U}1490481651871-ab68de25d43d${Q}`,
  ],

  // ── Games ──────────────────────────────────────────────────────────────────
  "Nintendo Switch OLED Bundle": [
    `${U}1496181133206-80ce9b88a853${Q}`,
    `${U}1517336714731-489689fd1ca8${Q}`,
    `${U}1485965120184-e220f721d03e${Q}`,
  ],
};

async function main() {
  console.log("🖼️  Fixing listing images…");
  let updated = 0;
  let skipped = 0;

  for (const [title, images] of Object.entries(FIXES)) {
    const result = await db.listing.updateMany({
      where: { title },
      data: { images },
    });
    if (result.count > 0) {
      console.log(`  ✓  ${title}`);
      updated++;
    } else {
      console.warn(`  ⚠  Not found: ${title}`);
      skipped++;
    }
  }

  console.log(`\n✅  Updated ${updated} listings. Skipped ${skipped}.`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
