import type { Equipment } from "@/lib/types";
import { formatZAR } from "@/lib/utils/helpers";
import styles from "./EquipmentCard.module.css";

interface EquipmentCardProps {
  equipment: Equipment;
  onClick?: () => void;
}

export function EquipmentCard({ equipment, onClick }: EquipmentCardProps) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.thumb}>
        {equipment.imageUrls[0] ? (
          <img src={equipment.imageUrls[0]} alt={equipment.title} />
        ) : (
          <div className={styles.placeholder} />
        )}
        <span className={`${styles.badge} ${equipment.available ? styles.available : styles.booked}`}>
          {equipment.available ? "Available" : "Booked"}
        </span>
      </div>
      <div className={styles.body}>
        <p className={styles.category}>{equipment.category}</p>
        <h3 className={styles.title}>{equipment.title}</h3>
        <p className={styles.location}>{equipment.location.address}</p>
        <p className={styles.rate}>{formatZAR(equipment.dailyRate * 100)} / day</p>
      </div>
    </div>
  );
}
