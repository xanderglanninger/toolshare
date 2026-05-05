// lib/types/listing.ts

export type ListingCategory =
  | "ELECTRONICS"
  | "TOOLS_EQUIPMENT"
  | "SPORTS_OUTDOORS"
  | "VEHICLES"
  | "CLOTHING_ACCESSORIES"
  | "FURNITURE_HOME"
  | "MUSICAL_INSTRUMENTS"
  | "BOOKS_MEDIA"
  | "GAMES_TOYS"
  | "CAMERAS_PHOTOGRAPHY"
  | "PARTY_EVENTS"
  | "OTHER";

// Shape returned from the DB (includes joined owner fields)
export type Listing = {
  id:               string;
  title:            string;
  description:      string;
  category:         ListingCategory;
  images:           string[];
  pricePerDay:      number;
  pricePerWeek:     number | null;
  pricePerMonth:    number | null;
  depositAmount:    number | null;
  isAvailable:      boolean;
  availableFrom:    Date | null;
  availableTo:      Date | null;
  address:          string;
  city:             string;
  province:         string;
  postalCode:       string | null;
  latitude:         number | null;
  longitude:        number | null;
  quantity:         number;
  currentValue:     number | null;
  itemInsured:      boolean;
  make:             string | null;
  model:            string | null;
  size:             string | null;
  deliveryAvailable: boolean;
  deliveryRadius:   number | null;
  deliveryFee:      number | null;
  ownerId:          string;
  owner:            { id: string; name: string; surname: string; image: string | null };
  reviews:          { rating: number }[];
  createdAt:        Date;
  updatedAt:        Date;
};

// Payload for creating a new listing
export type CreateListingInput = {
  title:            string;
  description:      string;
  category:         ListingCategory;
  images:           string[];
  pricePerDay:      number;
  pricePerWeek?:    number | null;
  pricePerMonth?:   number | null;
  depositAmount?:   number | null;
  availableFrom?:   string | null; // ISO string from form
  availableTo?:     string | null;
  address:          string;
  city:             string;
  province:         string;
  postalCode?:      string | null;
  latitude?:        number | null;
  longitude?:       number | null;
  quantity?:        number;
  currentValue?:    number | null;
  itemInsured?:     boolean;
  make?:            string | null;
  model?:           string | null;
  size?:            string | null;
  deliveryAvailable: boolean;
  deliveryRadius?:  number | null;
  deliveryFee?:     number | null;
};

// Payload for updating (all fields optional except none required)
export type UpdateListingInput = Partial<CreateListingInput> & {
  isAvailable?: boolean;
};

// Query filters for listing browsing
export type ListingFilters = {
  category?:    ListingCategory;
  city?:        string;
  search?:      string;
  minPrice?:    number;
  maxPrice?:    number;
  available?:   boolean;
  ownerId?:     string;
  page?:        number;
  limit?:       number;
  random?:      boolean;
};