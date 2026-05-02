import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter } as any);

const Q = "?auto=format&fit=crop&w=1200&q=80";
const U = "https://images.unsplash.com/photo-";

const IMAGES: Record<string, string[]> = {
  "DeWalt 20V Cordless Drill Set": [
    `${U}1504148455328-c376907d081c${Q}`,
    `${U}1572981779307-38b8cabb2407${Q}`,
    `${U}1581147036324-c47a03a81d48${Q}`,
  ],
  "Bosch Angle Grinder 230mm": [
    `${U}1590959651373-a3db0f38a961${Q}`,
    `${U}1504148455328-c376907d081c${Q}`,
    `${U}1572981779307-38b8cabb2407${Q}`,
  ],
  "Pressure Washer 2000 PSI": [
    `${U}1558618666-fcd25c85cd64${Q}`,
    `${U}1558618047-3c8c76ca7c6a${Q}`,
    `${U}1585771724684-38269d6639fd${Q}`,
  ],
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
  "Epson EH-TW7100 4K Projector": [
    `${U}1478720568477-152d9b164e26${Q}`,
    `${U}1536240478-0e4e5c1a1a6b${Q}`,
    `${U}1517604931442-7e0c8ed2963c${Q}`,
  ],
  "Toyota Hiace 14-Seater Bus": [
    `${U}1544636331-e26879cd4d9b${Q}`,
    `${U}1449965408869-eaa3f722e8e0${Q}`,
    `${U}1570125901328-9f23a2ba85a8${Q}`,
  ],
  "Toyota LDV 1-Ton Bakkie": [
    `${U}1605559424843-9e4c228bf1c2${Q}`,
    `${U}1558618666-fcd25c85cd64${Q}`,
    `${U}1533473359331-0135ef1b58bf${Q}`,
  ],
  "Coleman 6-Person Camping Tent": [
    `${U}1504280390367-361c6d9f38f4${Q}`,
    `${U}1478131143081-80a7f947af91${Q}`,
    `${U}1537905569824-f89b14371a5e${Q}`,
  ],
  "Stand-Up Paddleboard (SUP) Set": [
    `${U}1530870110042-98b2cb110834${Q}`,
    `${U}1560707303-4e980ce93702${Q}`,
    `${U}1544551763-46a013bb70d5${Q}`,
  ],
  "Weber Master-Touch Braai": [
    `${U}1558030006-450675393462${Q}`,
    `${U}1529193591184-b1d58069ecdd${Q}`,
    `${U}1555396273-b9b4fdee8a8e${Q}`,
  ],
  "PA Sound System (2000W)": [
    `${U}1470225620780-dba8ba36b745${Q}`,
    `${U}1493225457124-a3eb161ffa5f${Q}`,
    `${U}1571974599782-87624638275c${Q}`,
  ],
  "Marquee Tent 6m × 9m": [
    `${U}1519671482749-fd09be7ccebf${Q}`,
    `${U}1511578314322-379afb476865${Q}`,
    `${U}1464366400600-ac2779fba5f7${Q}`,
  ],
  "Yamaha P-125 Digital Piano": [
    `${U}1520523839897-bd0b52f945a0${Q}`,
    `${U}1507838153414-b4b713384a76${Q}`,
    `${U}1552422535-c45813c61732${Q}`,
  ],
  "Canon PIXMA Pro-200 Photo Printer": [
    `${U}1612815154858-60aa4c59eaa6${Q}`,
    `${U}1563461660947-507ef49e9c47${Q}`,
    `${U}1586953208448-b90a07a46b78${Q}`,
  ],
};

async function main() {
  console.log("🖼️  Adding images to listings…");
  let updated = 0;

  for (const [title, images] of Object.entries(IMAGES)) {
    const result = await db.listing.updateMany({
      where: { title },
      data: { images },
    });
    if (result.count > 0) {
      console.log(`  ✓  ${title}`);
      updated++;
    } else {
      console.warn(`  ⚠  Not found: ${title}`);
    }
  }

  console.log(`\n✅  Updated ${updated} listings with images.`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
