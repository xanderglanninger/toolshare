import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter } as any);

const Q = "auto=format&fit=crop&w=1200&q=80";
const U = (id: string) => `https://images.unsplash.com/photo-${id}?${Q}`;

// Curated Unsplash photo IDs by equipment type
const PHOTOS = {
  // Drills & rotary tools
  drill1:      U("1504148455328-c376907d081c"),
  drill2:      U("1581147036324-c47a03a81d48"),
  drill3:      U("1572981779307-38b8cabb2407"),
  drill4:      U("1609621397834-a5e28bdc7b48"),
  drill5:      U("1530124566582-a618bc2615dc"),

  // Grinders
  grinder1:    U("1590959651373-a3db0f38a961"),
  grinder2:    U("1558618047-3c8c76ca7c6a"),
  grinder3:    U("1621905252507-b35492cc74b4"),

  // Saws
  saw1:        U("1572981779307-38b8cabb2407"),
  saw2:        U("1504917595217-d4dc5ebe6122"),
  saw3:        U("1530124566582-a618bc2615dc"),
  saw4:        U("1581092334651-ddf26d9a09d0"),

  // Concrete & mixing
  mixer1:      U("1504917595217-d4dc5ebe6122"),
  mixer2:      U("1558618666-fcd25c85cd64"),
  mixer3:      U("1589939705384-5185137a7f0f"),
  concrete1:   U("1541888946425-d81bb19240f5"),
  concrete2:   U("1503387762-592deb58ef4e"),

  // Compaction
  compact1:    U("1581092334651-ddf26d9a09d0"),
  compact2:    U("1589939705384-5185137a7f0f"),
  compact3:    U("1504917595217-d4dc5ebe6122"),

  // Scaffolding & ladders
  scaffold1:   U("1593978301851-5b66a1d6edc5"),
  scaffold2:   U("1600585154526-990dced4db0d"),
  scaffold3:   U("1541888946425-d81bb19240f5"),
  scaffold4:   U("1503387762-592deb58ef4e"),
  ladder1:     U("1600585154526-990dced4db0d"),
  ladder2:     U("1581092334651-ddf26d9a09d0"),
  ladder3:     U("1593978301851-5b66a1d6edc5"),

  // Generators & power
  gen1:        U("1590725121172-6ec66d8e7a6c"),
  gen2:        U("1504328345951-4a801c74e8f8"),
  gen3:        U("1558618666-fcd25c85cd64"),
  gen4:        U("1589939705384-5185137a7f0f"),

  // Welding
  weld1:       U("1563906028-8bb9cefc6fea"),
  weld2:       U("1604328698692-f52296cd463e"),
  weld3:       U("1581147036324-c47a03a81d48"),
  weld4:       U("1572981779307-38b8cabb2407"),

  // Construction sites
  site1:       U("1503387762-592deb58ef4e"),
  site2:       U("1541888946425-d81bb19240f5"),
  site3:       U("1589939705384-5185137a7f0f"),
  site4:       U("1581092334651-ddf26d9a09d0"),
  site5:       U("1504328345951-4a801c74e8f8"),
  site6:       U("1504917595217-d4dc5ebe6122"),
  site7:       U("1530124566582-a618bc2615dc"),

  // Pressure washers / pumps
  wash1:       U("1558618666-fcd25c85cd64"),
  wash2:       U("1585771724684-38269d6639fd"),
  wash3:       U("1558618047-3c8c76ca7c6a"),

  // Flooring
  floor1:      U("1558618666-fcd25c85cd64"),
  floor2:      U("1572981779307-38b8cabb2407"),
  floor3:      U("1590959651373-a3db0f38a961"),
  floor4:      U("1503387762-592deb58ef4e"),

  // Lifting & hoists
  hoist1:      U("1593978301851-5b66a1d6edc5"),
  hoist2:      U("1541888946425-d81bb19240f5"),
  hoist3:      U("1504328345951-4a801c74e8f8"),

  // Safety & site ancillary
  safety1:     U("1589939705384-5185137a7f0f"),
  safety2:     U("1503387762-592deb58ef4e"),
  safety3:     U("1541888946425-d81bb19240f5"),

  // Measurement
  measure1:    U("1504148455328-c376907d081c"),
  measure2:    U("1530124566582-a618bc2615dc"),
  measure3:    U("1581092334651-ddf26d9a09d0"),

  // Hand tools
  hand1:       U("1504148455328-c376907d081c"),
  hand2:       U("1572981779307-38b8cabb2407"),
  hand3:       U("1530124566582-a618bc2615dc"),
  hand4:       U("1558618047-3c8c76ca7c6a"),
};

// Title → images mapping
const imageMap: Record<string, string[]> = {
  "SDS Plus Rotary Hammer Drill 1500W":              [PHOTOS.drill1, PHOTOS.drill4, PHOTOS.site1],
  "Bosch GSB 18V Combi Drill Set":                   [PHOTOS.drill2, PHOTOS.drill3, PHOTOS.hand1],
  "Angle Grinder 125mm 900W":                        [PHOTOS.grinder1, PHOTOS.grinder3, PHOTOS.site2],
  "Angle Grinder 230mm 2200W":                       [PHOTOS.grinder2, PHOTOS.grinder1, PHOTOS.weld4],
  "Reciprocating Saw (Sabre Saw)":                   [PHOTOS.saw1, PHOTOS.saw3, PHOTOS.site3],
  "Jigsaw Variable Speed 800W":                      [PHOTOS.saw2, PHOTOS.saw4, PHOTOS.drill5],
  "Makita Circular Saw 185mm 1200W":                 [PHOTOS.saw1, PHOTOS.saw3, PHOTOS.site4],
  "Mitre Saw 210mm Sliding":                         [PHOTOS.saw2, PHOTOS.drill4, PHOTOS.hand2],
  "Table Saw 254mm Portable":                        [PHOTOS.saw3, PHOTOS.saw4, PHOTOS.site5],
  "Random Orbital Sander 125mm":                     [PHOTOS.grinder3, PHOTOS.drill5, PHOTOS.hand3],

  "Concrete Mixer 140L Electric":                    [PHOTOS.mixer1, PHOTOS.concrete1, PHOTOS.site6],
  "Concrete Mixer 200L Petrol":                      [PHOTOS.mixer2, PHOTOS.concrete2, PHOTOS.gen2],
  "Paddle Mixer / Plaster Mixer":                    [PHOTOS.mixer3, PHOTOS.mixer1, PHOTOS.drill1],
  "Poker Vibrator for Concrete":                     [PHOTOS.concrete1, PHOTOS.mixer2, PHOTOS.site1],
  "Floor Screed Levelling Tool Set":                 [PHOTOS.concrete2, PHOTOS.floor4, PHOTOS.hand4],

  "Wacker Plate Compactor 90kg":                     [PHOTOS.compact1, PHOTOS.compact2, PHOTOS.site2],
  "Reversible Plate Compactor 160kg":                [PHOTOS.compact3, PHOTOS.compact1, PHOTOS.gen4],
  "Trench Rammer / Jump Jack":                       [PHOTOS.compact2, PHOTOS.site3, PHOTOS.concrete1],

  "Mobile Scaffold Tower 4m (Aluminium)":            [PHOTOS.scaffold1, PHOTOS.scaffold3, PHOTOS.site4],
  "Mobile Scaffold Tower 6m (Aluminium)":            [PHOTOS.scaffold2, PHOTOS.scaffold4, PHOTOS.ladder3],
  "System Scaffold Set (30m²)":                      [PHOTOS.scaffold3, PHOTOS.scaffold1, PHOTOS.site5],
  "Extension Ladder 8m Aluminium":                   [PHOTOS.ladder1, PHOTOS.ladder2, PHOTOS.site6],
  "Extension Ladder 12m Fibreglass":                 [PHOTOS.ladder3, PHOTOS.ladder1, PHOTOS.scaffold2],
  "Trestle Scaffold Set (Pair + Boards)":            [PHOTOS.scaffold4, PHOTOS.scaffold2, PHOTOS.site7],

  "Petrol Generator 3.5KVA":                         [PHOTOS.gen1, PHOTOS.gen3, PHOTOS.site1],
  "Silent Diesel Generator 8KVA":                    [PHOTOS.gen2, PHOTOS.gen4, PHOTOS.site2],
  "Site Distribution Board (32A)":                   [PHOTOS.gen3, PHOTOS.gen1, PHOTOS.site3],
  "50m Heavy-Duty Extension Reel":                   [PHOTOS.gen4, PHOTOS.gen2, PHOTOS.drill1],

  "MIG Welder 200A":                                 [PHOTOS.weld1, PHOTOS.weld2, PHOTOS.site4],
  "Arc Welder 160A (Stick Welder)":                  [PHOTOS.weld2, PHOTOS.weld3, PHOTOS.grinder2],
  "TIG Welder 200A AC/DC":                           [PHOTOS.weld3, PHOTOS.weld1, PHOTOS.site5],
  "Gas Cutting Torch Set (Oxy-Acetylene)":           [PHOTOS.weld4, PHOTOS.weld2, PHOTOS.grinder1],
  "Plasma Cutter 50A":                               [PHOTOS.weld1, PHOTOS.weld4, PHOTOS.site6],

  "Electric Demolition Hammer 1750W":                [PHOTOS.drill1, PHOTOS.drill4, PHOTOS.concrete1],
  "Pneumatic Breaker + Compressor Combo":            [PHOTOS.compact1, PHOTOS.drill2, PHOTOS.site7],
  "Diamond Core Drill 152mm":                        [PHOTOS.drill3, PHOTOS.drill5, PHOTOS.site1],

  "Material Hoist 200kg (Chain Block)":              [PHOTOS.hoist1, PHOTOS.scaffold3, PHOTOS.site2],
  "Electric Chain Hoist 500kg":                      [PHOTOS.hoist2, PHOTOS.hoist3, PHOTOS.gen2],
  "Telehandler / Loadall 3T 7m Reach":               [PHOTOS.hoist3, PHOTOS.site3, PHOTOS.concrete2],
  "Pallet Jack 2.5T":                                [PHOTOS.compact3, PHOTOS.site4, PHOTOS.hoist1],
  "Builder's Wheelbarrow (6 Cubic Ft)":              [PHOTOS.mixer3, PHOTOS.concrete1, PHOTOS.site5],

  "Steel Formwork Panel Set (20m²)":                 [PHOTOS.scaffold1, PHOTOS.concrete2, PHOTOS.site6],
  "Acrow Prop Adjustable Steel Shores (Set of 10)":  [PHOTOS.scaffold2, PHOTOS.scaffold4, PHOTOS.site7],

  "Rotary Laser Level Kit":                          [PHOTOS.measure1, PHOTOS.measure2, PHOTOS.site1],
  "Total Station (Survey Theodolite)":               [PHOTOS.measure2, PHOTOS.measure3, PHOTOS.site2],
  "Digital Dumpy Level (Auto-Level)":                [PHOTOS.measure3, PHOTOS.ladder2, PHOTOS.site3],
  "Laser Line Level Cross-Line Kit":                 [PHOTOS.measure1, PHOTOS.drill4, PHOTOS.site4],

  "Submersible Water Pump 1.5kW":                    [PHOTOS.wash1, PHOTOS.gen3, PHOTOS.site5],
  "Petrol Trash / Sewage Pump 3\"":                  [PHOTOS.wash2, PHOTOS.gen4, PHOTOS.compact2],
  "Grout Pump / Plaster Pump":                       [PHOTOS.wash3, PHOTOS.mixer2, PHOTOS.site6],

  "Air Compressor 50L 2HP":                          [PHOTOS.gen1, PHOTOS.gen3, PHOTOS.drill5],
  "Portable Air Compressor 100L 3HP":                [PHOTOS.gen2, PHOTOS.gen4, PHOTOS.site7],

  "Floor Tile Cutter 900mm Manual":                  [PHOTOS.floor1, PHOTOS.floor2, PHOTOS.saw1],
  "Wet Diamond Tile Saw 300mm":                      [PHOTOS.floor2, PHOTOS.floor3, PHOTOS.grinder3],
  "Floor Grinder / Scarifier 400mm":                 [PHOTOS.floor3, PHOTOS.grinder1, PHOTOS.site1],
  "Power Trowel (Helicopter) 600mm":                 [PHOTOS.floor4, PHOTOS.concrete1, PHOTOS.mixer1],
  "Floor Sanding Machine (Drum Sander)":             [PHOTOS.floor1, PHOTOS.floor4, PHOTOS.grinder2],

  "Roof Safety Harness & Lanyard Kit":               [PHOTOS.safety1, PHOTOS.scaffold2, PHOTOS.ladder1],
  "Roofing Nail Gun (Coil Nailer)":                  [PHOTOS.drill4, PHOTOS.drill5, PHOTOS.site2],
  "Pipe Bender Manual 15–22mm":                      [PHOTOS.hand2, PHOTOS.hand4, PHOTOS.drill3],

  "Mini Excavator 1.5T (with Operator)":             [PHOTOS.site3, PHOTOS.compact3, PHOTOS.concrete2],
  "Trenching Machine (Chain Trencher) 600mm":        [PHOTOS.compact2, PHOTOS.site4, PHOTOS.site7],
  "Earth Auger Petrol 200mm Bit":                    [PHOTOS.drill1, PHOTOS.compact1, PHOTOS.site5],

  "Pressure Washer 3000 PSI Petrol":                 [PHOTOS.wash1, PHOTOS.wash2, PHOTOS.site6],
  "Industrial Wet/Dry Vacuum 80L":                   [PHOTOS.wash3, PHOTOS.grinder3, PHOTOS.site7],
  "Airless Paint Sprayer 3000 PSI":                  [PHOTOS.wash2, PHOTOS.scaffold3, PHOTOS.site1],

  "Traffic Cone Set (20 × 750mm)":                   [PHOTOS.safety2, PHOTOS.safety3, PHOTOS.site2],
  "Builder's Site Toilet (Porta-Loo)":               [PHOTOS.site3, PHOTOS.safety1, PHOTOS.safety2],
  "Temporary Site Fencing (50m Panel Set)":          [PHOTOS.scaffold4, PHOTOS.safety3, PHOTOS.site4],
  "Construction Site Lighting Tower":                [PHOTOS.gen1, PHOTOS.gen2, PHOTOS.site5],
  "LED Site Floodlight 200W (Set of 4)":             [PHOTOS.gen3, PHOTOS.gen4, PHOTOS.site6],

  "Rebar Bender & Cutter Manual":                    [PHOTOS.weld4, PHOTOS.hand2, PHOTOS.site7],
  "Electric Rebar Cutter 32mm":                      [PHOTOS.weld3, PHOTOS.drill2, PHOTOS.site1],
  "Pipe Threading Machine ½\"–2\"":                  [PHOTOS.drill5, PHOTOS.hand3, PHOTOS.site2],
  "Drain Camera Inspection System":                  [PHOTOS.measure3, PHOTOS.drill4, PHOTOS.site3],
  "Metal Detector (Underground Cable & Pipe)":       [PHOTOS.measure2, PHOTOS.site4, PHOTOS.safety1],
  "Moisture Meter & Damp Probe Kit":                 [PHOTOS.measure1, PHOTOS.site5, PHOTOS.drill3],
  "Thermal Imaging Camera (Flir E6)":                [PHOTOS.measure3, PHOTOS.measure2, PHOTOS.site6],

  "Brick Laying Tool Kit (20-Piece)":                [PHOTOS.hand1, PHOTOS.hand4, PHOTOS.concrete2],
  "Plasterer's Tool Set (12-Piece)":                 [PHOTOS.hand2, PHOTOS.hand3, PHOTOS.mixer3],
  "Concrete Finishing Tool Set (8-Piece)":           [PHOTOS.concrete1, PHOTOS.hand4, PHOTOS.floor4],
  "Breaker Bar / Demolition Crowbar Set":            [PHOTOS.hand3, PHOTOS.grinder2, PHOTOS.site7],
  "Pipe Wrench Set (14\" + 18\" + 24\")":            [PHOTOS.hand1, PHOTOS.hand2, PHOTOS.site1],

  "Brick Hammer & Bolster Set":                      [PHOTOS.hand4, PHOTOS.hand1, PHOTOS.concrete2],
  "Scaffolding Swivel & Fixed Couplers (Box of 50)": [PHOTOS.scaffold1, PHOTOS.scaffold3, PHOTOS.site2],
  "Folding Work Platform (Sawhorse Set of 2)":       [PHOTOS.scaffold2, PHOTOS.scaffold4, PHOTOS.saw2],
  "Paint Spray Booth Tent 3m × 3m":                  [PHOTOS.wash2, PHOTOS.scaffold3, PHOTOS.site3],
  "Knee Pad & Elbow Pad Set (6 Pack)":               [PHOTOS.safety1, PHOTOS.safety2, PHOTOS.site4],
  "Cable Pull / Fish Tape 30m":                      [PHOTOS.drill5, PHOTOS.hand3, PHOTOS.site5],
  "Heavy-Duty Tarpaulin Set (4 × 6m, Pack of 3)":   [PHOTOS.site6, PHOTOS.scaffold4, PHOTOS.safety3],
  "Surveyor's Measuring Wheel":                      [PHOTOS.measure1, PHOTOS.measure3, PHOTOS.site7],
  "First Aid Kit (SANS 10400-T Site Kit)":           [PHOTOS.safety2, PHOTOS.safety3, PHOTOS.site1],
  "Builders' Transit Mixer Barrow":                  [PHOTOS.mixer2, PHOTOS.compact3, PHOTOS.concrete1],

  "Concrete Block Splitter":                         [PHOTOS.compact2, PHOTOS.concrete2, PHOTOS.hand4],
  "Needle Scaler / Rust Remover":                    [PHOTOS.grinder1, PHOTOS.weld4, PHOTOS.hand2],
  "Gutter Cleaning Kit with Pressure Lance":         [PHOTOS.wash1, PHOTOS.ladder1, PHOTOS.scaffold2],
  "Hydraulic Pipe Press Tool Kit 16–63mm":           [PHOTOS.drill2, PHOTOS.drill4, PHOTOS.site2],
  "Walk-Behind Concrete Saw 350mm":                  [PHOTOS.saw2, PHOTOS.concrete1, PHOTOS.site3],
  "Portable Site Office / Storage Container 6m":     [PHOTOS.site4, PHOTOS.gen2, PHOTOS.safety3],
  "Cable Drum Reel Trolley (500kg)":                 [PHOTOS.gen3, PHOTOS.site5, PHOTOS.hoist1],
};

async function main() {
  console.log("🖼️  Updating construction listing images…");

  let updated = 0;
  let notFound = 0;

  for (const [title, images] of Object.entries(imageMap)) {
    const result = await db.listing.updateMany({
      where: { title },
      data: { images },
    });
    if (result.count > 0) {
      updated += result.count;
    } else {
      console.warn(`  ⚠  Not found: "${title}"`);
      notFound++;
    }
  }

  console.log(`  ✓  ${updated} listings updated`);
  if (notFound > 0) console.log(`  ⚠  ${notFound} titles not matched`);
  console.log("\n✅  Done!\n");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
