"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateListing.module.css";

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const Icons = {
  check: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2.5 6.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
  ),
  save: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  upload: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  info: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  errorCircle: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 4.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="7" cy="9.5" r="0.7" fill="currentColor"/>
    </svg>
  ),
  imagePlaceholder: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
};

const CategoryIcons: Record<string, React.ReactNode> = {
  ELECTRONICS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  TOOLS_EQUIPMENT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>
    </svg>
  ),
  SPORTS_OUTDOORS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  VEHICLES: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/>
      <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  CLOTHING_ACCESSORIES: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
    </svg>
  ),
  FURNITURE_HOME: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/>
      <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0z"/>
      <path d="M4 18v2M20 18v2M12 4v9"/>
    </svg>
  ),
  MUSICAL_INSTRUMENTS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  BOOKS_MEDIA: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  GAMES_TOYS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
      <line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/>
      <rect x="2" y="6" width="20" height="12" rx="2"/>
    </svg>
  ),
  CAMERAS_PHOTOGRAPHY: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  PARTY_EVENTS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  OTHER: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

// ─── Types ─────────────────────────────────────────────────────────────────

type FormData = {
  title: string;
  description: string;
  category: string;
  images: string[];
  pricePerDay: string;
  availableFrom: string;
  availableTo: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  deliveryAvailable: boolean;
  deliveryRadius: string;
  deliveryFee: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "ELECTRONICS",          label: "Electronics"    },
  { value: "TOOLS_EQUIPMENT",      label: "Tools"          },
  { value: "SPORTS_OUTDOORS",      label: "Outdoors"       },
  { value: "VEHICLES",             label: "Vehicles"       },
  { value: "CLOTHING_ACCESSORIES", label: "Clothing"       },
  { value: "FURNITURE_HOME",       label: "Furniture"      },
  { value: "MUSICAL_INSTRUMENTS",  label: "Instruments"    },
  { value: "BOOKS_MEDIA",          label: "Books & Media"  },
  { value: "GAMES_TOYS",           label: "Games & Toys"   },
  { value: "CAMERAS_PHOTOGRAPHY",  label: "Cameras"        },
  { value: "PARTY_EVENTS",         label: "Party & Events" },
  { value: "OTHER",                label: "Other"          },
];

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

const STEPS = [
  { id: 1, label: "Details"  },
  { id: 2, label: "Photos"   },
  { id: 3, label: "Pricing"  },
  { id: 4, label: "Location" },
  { id: 5, label: "Review"   },
];

const EMPTY: FormData = {
  title: "", description: "", category: "",
  images: [],
  pricePerDay: "",
  availableFrom: "", availableTo: "",
  address: "", city: "", province: "", postalCode: "",
  deliveryAvailable: false, deliveryRadius: "", deliveryFee: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatZAR(val: string) {
  const n = parseFloat(val);
  if (!val || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency", currency: "ZAR", maximumFractionDigits: 0,
  }).format(n);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

// ─── Step bar ───────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className={styles.stepBar}>
      {STEPS.map((step, i) => {
        const isDone   = current > step.id;
        const isActive = current === step.id;
        const cls = isDone ? styles.stepDone : isActive ? styles.stepActive : "";
        return (
          <div key={step.id} className={`${styles.stepItem} ${cls}`}>
            <div className={styles.stepInner}>
              <div className={styles.stepDot}>
                {isDone ? Icons.check : step.id}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={styles.stepLine} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Details ───────────────────────────────────────────────────────

function Step1({ form, onChange }: { form: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  return (
    <>
      <p className={styles.stepTitle}>What are you listing?</p>
      <p className={styles.stepSub}>Give borrowers a clear, detailed picture of your item.</p>

      <div className={styles.field}>
        <label>Category <span className={styles.req}>*</span></label>
        <div className={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`${styles.catChip} ${form.category === cat.value ? styles.catChipSelected : ""}`}
              onClick={() => onChange("category", form.category === cat.value ? "" : cat.value)}
            >
              <span className={styles.catIcon}>
                {CategoryIcons[cat.value]}
              </span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="title">Title <span className={styles.req}>*</span></label>
        <input
          id="title" type="text"
          placeholder="e.g. Sony A7 III Mirrorless Camera"
          value={form.title} maxLength={100}
          onChange={(e) => onChange("title", e.target.value)}
        />
        <span className={styles.charCount}>{form.title.length} / 100</span>
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Description <span className={styles.req}>*</span></label>
        <textarea
          id="description"
          placeholder="Describe the item, its condition, what's included, and any instructions for borrowers…"
          value={form.description} maxLength={2000} rows={5}
          onChange={(e) => onChange("description", e.target.value)}
        />
        <span className={styles.charCount}>{form.description.length} / 2000</span>
      </div>
    </>
  );
}

// ─── Step 2: Photos ─────────────────────────────────────────────────────────

function Step2({ form, onChange }: { form: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    const { data: { url } } = await res.json();
    return url;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 8 - form.images.length);
    if (!arr.length) return;
    setUploading(true);
    try {
      const urls = (await Promise.all(arr.map(uploadFile))).filter(Boolean) as string[];
      onChange("images", [...form.images, ...urls]);
    } catch {
      alert("One or more uploads failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [form.images, onChange]);

  const removeImage = (url: string) => {
    onChange("images", form.images.filter((u) => u !== url));
  };

  return (
    <>
      <p className={styles.stepTitle}>Photos</p>
      <p className={styles.stepSub}>
        Add or remove photos. Up to 8 images total.
      </p>

      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneDragOver : ""} ${uploading ? styles.dropzoneLoading : ""}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef} type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple style={{ display: "none" }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className={styles.uploadSpinner}>
            <div className={styles.spinner} />
            <span>Uploading…</span>
          </div>
        ) : (
          <>
            <div className={styles.dropIcon}>{Icons.upload}</div>
            <p className={styles.dropText}>
              Drop photos here or <span>browse files</span>
            </p>
            <p className={styles.dropHint}>
              JPEG · PNG · WebP · Max 5 MB each · {8 - form.images.length} slots remaining
            </p>
          </>
        )}
      </div>

      {form.images.length > 0 && (
        <div className={styles.imageGrid}>
          {form.images.map((url, i) => (
            <div key={url} className={styles.imageThumb}>
              <img src={url} alt={`listing photo ${i + 1}`} />
              {i === 0 && <span className={styles.coverBadge}>Cover</span>}
              <button
                type="button" className={styles.removeImg}
                onClick={() => removeImage(url)} aria-label="Remove photo"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Step 3: Pricing ────────────────────────────────────────────────────────

function PriceField({
  label, fieldKey, required, form, onChange,
}: {
  label: string; fieldKey: keyof FormData; required?: boolean;
  form: FormData; onChange: (k: keyof FormData, v: any) => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label}{" "}
        {required
          ? <span className={styles.req}>*</span>
          : <span className={styles.optional}>(optional)</span>}
      </label>
      <div className={styles.inputPrefix}>
        <span className={styles.prefix}>R</span>
        <input
          type="number" min="0" step="1" placeholder="0"
          value={form[fieldKey] as string}
          onChange={(e) => onChange(fieldKey, e.target.value)}
        />
      </div>
    </div>
  );
}

function Step3({ form, onChange }: { form: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  return (
    <>
      <p className={styles.stepTitle}>Pricing & availability</p>
      <p className={styles.stepSub}>Update your rates. Weekly and monthly discounts are optional.</p>

      <div className={styles.twoCol}>
        <PriceField label="Per day"          fieldKey="pricePerDay"    required form={form} onChange={onChange} />
      </div>

      <div className={styles.divider} />

      <p className={styles.sectionTitle}>Availability window</p>
      <p className={styles.sectionSub}>Leave blank to keep the listing open-ended.</p>

      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label>Available from</label>
          <input type="date" min={today()} value={form.availableFrom}
            onChange={(e) => onChange("availableFrom", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Available until</label>
          <input type="date" min={form.availableFrom || today()} value={form.availableTo}
            onChange={(e) => onChange("availableTo", e.target.value)} />
        </div>
      </div>
    </>
  );
}

// ─── Step 4: Location ───────────────────────────────────────────────────────

function Step4({ form, onChange }: { form: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  return (
    <>
      <p className={styles.stepTitle}>Location & delivery</p>
      <p className={styles.stepSub}>Where will borrowers collect the item?</p>

      <div className={styles.field}>
        <label>Street address <span className={styles.req}>*</span></label>
        <input type="text" placeholder="123 Main Road" value={form.address}
          onChange={(e) => onChange("address", e.target.value)} />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label>City <span className={styles.req}>*</span></label>
          <input type="text" placeholder="Johannesburg" value={form.city}
            onChange={(e) => onChange("city", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Province <span className={styles.req}>*</span></label>
          <select value={form.province} onChange={(e) => onChange("province", e.target.value)}>
            <option value="">Select province</option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${styles.field} ${styles.halfWidth}`}>
        <label>Postal code <span className={styles.optional}>(optional)</span></label>
        <input type="text" placeholder="0001" maxLength={10} value={form.postalCode}
          onChange={(e) => onChange("postalCode", e.target.value)} />
      </div>

      <div className={styles.divider} />

      <label
        className={styles.toggleRow}
        onClick={() => onChange("deliveryAvailable", !form.deliveryAvailable)}
      >
        <div className={`${styles.toggleTrack} ${form.deliveryAvailable ? styles.toggleOn : ""}`}>
          <div className={styles.toggleThumb} />
        </div>
        <span className={styles.toggleLabel}>I can deliver this item</span>
      </label>

      {form.deliveryAvailable && (
        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label>Delivery radius (km)</label>
            <input type="number" min="1" placeholder="20" value={form.deliveryRadius}
              onChange={(e) => onChange("deliveryRadius", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Delivery fee <span className={styles.optional}>(optional)</span></label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>R</span>
              <input type="number" min="0" placeholder="0" value={form.deliveryFee}
                onChange={(e) => onChange("deliveryFee", e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Step 5: Review ─────────────────────────────────────────────────────────

function Step5({ form }: { form: FormData }) {
  const cat = CATEGORIES.find((c) => c.value === form.category);

  return (
    <>
      <p className={styles.stepTitle}>Review your changes</p>
      <p className={styles.stepSub}>Everything look right? Hit save when you're ready.</p>

      <div className={styles.reviewCard}>
        {form.images.length === 0 ? (
          <div className={styles.reviewNoImage}>{Icons.imagePlaceholder}</div>
        ) : (
          <div className={styles.reviewImage}>
            <img src={form.images[0]} alt="cover" />
            {form.images.length > 1 && (
              <span className={styles.reviewImgCount}>+{form.images.length - 1} more</span>
            )}
          </div>
        )}

        <div className={styles.reviewBody}>
          {cat && (
            <div className={styles.reviewBadge}>
              <span className={styles.reviewBadgeIcon}>{CategoryIcons[cat.value]}</span>
              {cat.label}
            </div>
          )}
          <p className={styles.reviewTitle}>{form.title || "—"}</p>
          <p className={styles.reviewDesc}>{form.description || "No description provided."}</p>

          <div className={styles.reviewGrid}>
            <div className={styles.reviewBlock}>
              <span className={styles.reviewBlockLabel}>Daily rate</span>
              <span className={styles.reviewBlockValue}>{formatZAR(form.pricePerDay)}</span>
            </div>
            <div className={styles.reviewBlock}>
              <span className={styles.reviewBlockLabel}>Location</span>
              <span className={styles.reviewBlockValue}>
                {[form.city, form.province].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className={styles.reviewBlock}>
              <span className={styles.reviewBlockLabel}>Delivery</span>
              <span className={styles.reviewBlockValue}>
                {form.deliveryAvailable
                  ? `Yes · ${form.deliveryRadius || "?"}km · ${formatZAR(form.deliveryFee)}`
                  : "Collection only"}
              </span>
            </div>
            <div className={styles.reviewBlock}>
              <span className={styles.reviewBlockLabel}>Available from</span>
              <span className={styles.reviewBlockValue}>
                {form.availableFrom
                  ? `${form.availableFrom}${form.availableTo ? ` → ${form.availableTo}` : " onwards"}`
                  : "Open-ended"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type Props = {
  listingId: string;
  onDone: () => void;
};

export default function EditListing({ listingId, onDone }: Props) {
  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        if (!res.ok) throw new Error("Not found");
        const { data } = await res.json();
        setForm({
          title:             data.title ?? "",
          description:       data.description ?? "",
          category:          data.category ?? "",
          images:            data.images ?? [],
          pricePerDay:       data.pricePerDay != null    ? String(data.pricePerDay)    : "",
          availableFrom:     isoToDateInput(data.availableFrom),
          availableTo:       isoToDateInput(data.availableTo),
          address:           data.address ?? "",
          city:              data.city ?? "",
          province:          data.province ?? "",
          postalCode:        data.postalCode ?? "",
          deliveryAvailable: data.deliveryAvailable ?? false,
          deliveryRadius:    data.deliveryRadius != null ? String(data.deliveryRadius) : "",
          deliveryFee:       data.deliveryFee != null    ? String(data.deliveryFee)    : "",
        });
      } catch {
        setLoadError("Failed to load listing. Please go back and try again.");
      }
    }
    load();
  }, [listingId]);

  const onChange = useCallback((key: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = (): string | null => {
    if (step === 1) {
      if (!form.category)                        return "Please select a category.";
      if (form.title.trim().length < 5)          return "Title must be at least 5 characters.";
      if (form.description.trim().length < 20)   return "Description must be at least 20 characters.";
    }
    if (step === 2 && form.images.length === 0)  return "Please add at least one photo.";
    if (step === 3 && (!form.pricePerDay || parseFloat(form.pricePerDay) <= 0))
                                                 return "Please enter a valid daily price.";
    if (step === 4) {
      if (!form.address.trim())  return "Please enter a street address.";
      if (!form.city.trim())     return "Please enter a city.";
      if (!form.province)        return "Please select a province.";
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title:             form.title,
        description:       form.description,
        category:          form.category,
        images:            form.images,
        pricePerDay:       parseFloat(form.pricePerDay),
        pricePerWeek:      null,
        pricePerMonth:     null,
        depositAmount:     null,
        availableFrom:     form.availableFrom ? new Date(form.availableFrom).toISOString() : null,
        availableTo:       form.availableTo   ? new Date(form.availableTo).toISOString()   : null,
        address:           form.address,
        city:              form.city,
        province:          form.province,
        postalCode:        form.postalCode || null,
        deliveryAvailable: form.deliveryAvailable,
        deliveryRadius:    form.deliveryRadius ? parseFloat(form.deliveryRadius) : null,
        deliveryFee:       form.deliveryFee    ? parseFloat(form.deliveryFee)    : null,
      };

      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update listing");
      }

      onDone();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className={styles.page}>
        <p style={{ padding: "2rem", color: "red" }}>{loadError}</p>
        <button className={styles.btnGhost} onClick={onDone} style={{ marginLeft: "2rem" }}>
          {Icons.arrowLeft} Back to listings
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Listings</p>
          <h1 className={styles.pageTitle}>Edit listing</h1>
        </div>
        <button className={styles.btnGhost} type="button" onClick={onDone}>
          {Icons.arrowLeft} Back
        </button>
      </div>

      <StepBar current={step} />

      <div className={styles.card}>
        {step === 1 && <Step1 form={form} onChange={onChange} />}
        {step === 2 && <Step2 form={form} onChange={onChange} />}
        {step === 3 && <Step3 form={form} onChange={onChange} />}
        {step === 4 && <Step4 form={form} onChange={onChange} />}
        {step === 5 && <Step5 form={form} />}

        {error && (
          <div className={styles.errorBanner}>
            {Icons.errorCircle}
            {error}
          </div>
        )}

        <div className={styles.formNav}>
          {step > 1 ? (
            <button className={styles.btnGhost} type="button" onClick={back}>
              {Icons.arrowLeft} Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button className={styles.btnPrimary} type="button" onClick={next}>
              Continue {Icons.arrowRight}
            </button>
          ) : (
            <button
              className={styles.btnPrimary} type="button"
              onClick={submit} disabled={submitting}
            >
              {submitting ? (
                <><div className={styles.spinner} /> Saving…</>
              ) : (
                <>{Icons.save} Save changes</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
