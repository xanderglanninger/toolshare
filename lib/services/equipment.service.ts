// Replaced by listing.services.ts — Equipment model was removed from schema
import type { Equipment } from "@/lib/types";

export async function getEquipmentById(_id: string): Promise<Equipment | null> {
  return null;
}
export async function listEquipment(_filters?: object): Promise<Equipment[]> {
  return [];
}
export async function createEquipment(_ownerId: string, _data: object): Promise<Equipment> {
  throw new Error("Use listing.services.ts instead");
}
export async function updateEquipment(_id: string, _data: object): Promise<Equipment> {
  throw new Error("Use listing.services.ts instead");
}
export async function deleteEquipment(_id: string): Promise<void> {
  throw new Error("Use listing.services.ts instead");
}
