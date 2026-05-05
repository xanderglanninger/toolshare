"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./register.module.css";
import Logo from "@/components/ui/Logo";
import { validateSAId } from "@/lib/utils/sa-id";

const slides = [
  {
    title: "Join thousands of traders",
    subtitle: "List your gear once and start earning. No hidden fees, no lock-in.",
  },
  {
    title: "Verified. Insured. Ready.",
    subtitle: "Every listing is checked before it goes live — so borrowers trust you from day one.",
  },
  {
    title: "Your yard, your rates",
    subtitle: "Set your own daily and weekly pricing. Pause listings whenever the kit's in use.",
  },
];

const steps = ["Account", "Identity", "Documents", "Security"];

type UploadState = {
  url: string;
  preview: string;
  uploading: boolean;
  error: string;
};

function emptyUpload(): UploadState {
  return { url: "", preview: "", uploading: false, error: "" };
}

function RegisterContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? "/dashboard";
  const [step, setStep]           = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [tick, setTick]           = useState(0);

  const [form, setForm] = useState({
    name:            "",
    surname:         "",
    email:           "",
    confirmEmail:    "",
    idNumber:        "",
    password:        "",
    confirmPassword: "",
  });

  const [selfie,   setSelfie]   = useState<UploadState>(emptyUpload());
  const [idPhoto,  setIdPhoto]  = useState<UploadState>(emptyUpload());

  const selfieRef  = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [tick]);

  const goToSlide = (i: number) => {
    setActiveSlide(i);
    setTick((t) => t + 1);
  };

  const uploadFile = async (
    file: File,
    kind: "selfie" | "id_photo",
    setState: (s: UploadState) => void
  ) => {
    const preview = URL.createObjectURL(file);
    setState({ url: "", preview, uploading: true, error: "" });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    try {
      const res  = await fetch("/api/register/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setState({ url: "", preview, uploading: false, error: data.error || "Upload failed." });
      } else {
        setState({ url: data.url, preview, uploading: false, error: "" });
      }
    } catch {
      setState({ url: "", preview, uploading: false, error: "Upload failed. Please try again." });
    }
  };

  const handleFileChange = (
    kind: "selfie" | "id_photo",
    setState: (s: UploadState) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, kind, setState);
  };

  const validateStep = (): string => {
    if (step === 0) {
      if (!form.name.trim())    return "Please enter your first name.";
      if (!form.surname.trim()) return "Please enter your surname.";
      if (!form.email.trim())   return "Please enter your email address.";
      if (!/\S+@\S+\.\S+/.test(form.email)) return "Please enter a valid email address.";
      if (form.email !== form.confirmEmail) return "Email addresses don't match.";
    }
    if (step === 1) {
      if (!form.idNumber.trim()) return "Please enter your ID number.";
      const result = validateSAId(form.idNumber);
      if (!result.valid) return result.error!;
    }
    if (step === 2) {
      if (!selfie.url && !selfie.uploading)   return "Please upload a selfie photo.";
      if (selfie.uploading)                    return "Please wait for your selfie to finish uploading.";
      if (!idPhoto.url && !idPhoto.uploading) return "Please upload a photo of your ID document.";
      if (idPhoto.uploading)                  return "Please wait for your ID photo to finish uploading.";
    }
    if (step === 3) {
      if (!form.password)                         return "Please enter a password.";
      if (form.password.length < 8)               return "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) return "Passwords don't match.";
    }
    return "";
  };

  const handleNext = async () => {
    setError("");
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:       form.name,
          surname:    form.surname,
          email:      form.email,
          idNumber:   form.idNumber,
          password:   form.password,
          selfieUrl:  selfie.url,
          idPhotoUrl: idPhoto.url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setIsLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push(`/login?registered=true&redirect=${encodeURIComponent(redirectTo)}`);
      } else {
        router.push(redirectTo);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 0) setStep(step - 1);
  };

  const handleGoogle = async () => {
    await signIn("google", { callbackUrl: redirectTo });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* ── Left: form ── */}
        <div className={styles.left}>
          <Logo size="md" />

          <div className={styles.formArea}>
            <p className={styles.formEyebrow}>Equipment lending platform</p>
            <h1 className={styles.formTitle}>
              Create your<br />free account
            </h1>

            {/* Step indicator */}
            <div className={styles.stepper}>
              {steps.map((label, i) => (
                <div
                  key={i}
                  className={`${styles.stepItem}${i === step ? " " + styles.stepActive : ""}${i < step ? " " + styles.stepDone : ""}`}
                >
                  <div className={styles.stepCircle}>
                    {i < step ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span className={styles.stepLabel}>{label}</span>
                  {i < steps.length - 1 && (
                    <div className={`${styles.stepLine}${i < step ? " " + styles.stepLineDone : ""}`} />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className={styles.errorBanner}>{error}</div>
            )}

            {/* Step 0: Account */}
            {step === 0 && (
              <div className={styles.stepFields}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="name">First name</label>
                    <input id="name" type="text" placeholder="John" value={form.name} onChange={set("name")} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="surname">Surname</label>
                    <input id="surname" type="text" placeholder="Smith" value={form.surname} onChange={set("surname")} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="email">Email address</label>
                  <input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set("email")} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="confirmEmail">Confirm email</label>
                  <input
                    id="confirmEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={form.confirmEmail}
                    onChange={set("confirmEmail")}
                    className={form.confirmEmail && form.confirmEmail !== form.email ? styles.fieldError : ""}
                  />
                  {form.confirmEmail && form.confirmEmail !== form.email && (
                    <span className={styles.errorMsg}>Email addresses don&apos;t match</span>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Identity */}
            {step === 1 && (
              <div className={styles.stepFields}>
                <div className={styles.field}>
                  <label htmlFor="idNumber">SA ID number</label>
                  <input
                    id="idNumber"
                    type="text"
                    placeholder="0000000000000"
                    maxLength={13}
                    value={form.idNumber}
                    onChange={set("idNumber")}
                  />
                  <span className={styles.fieldHint}>Your 13-digit South African ID number</span>
                  {form.idNumber.length === 13 && (() => {
                    const r = validateSAId(form.idNumber);
                    return r.valid
                      ? <span className={styles.idValid}>Valid ID — {r.gender}, born {r.dob?.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>
                      : <span className={styles.errorMsg}>{r.error}</span>;
                  })()}
                </div>
                <div className={styles.idPreview}>
                  <div className={styles.idCard}>
                    <div className={styles.idCardTop}>
                      <span className={styles.idCardLabel}>RSA ID</span>
                      <div className={styles.idCardDots}>
                        {Array.from({ length: 13 }).map((_, i) => (
                          <span
                            key={i}
                            className={`${styles.idDigit}${form.idNumber[i] ? " " + styles.idDigitFilled : ""}`}
                          >
                            {form.idNumber[i] || "·"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.idCardBottom}>
                      <span>{form.name || "First name"} {form.surname || "Surname"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {step === 2 && (
              <div className={styles.stepFields}>
                <p className={styles.docsIntro}>
                  We need to verify your identity. Upload a clear photo of your face and your SA ID document.
                  Your photos are stored securely and reviewed by our team.
                </p>

                {/* Selfie upload */}
                <div className={styles.uploadField}>
                  <label>Selfie — photo of your face</label>
                  <input
                    ref={selfieRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    style={{ display: "none" }}
                    onChange={handleFileChange("selfie", setSelfie)}
                  />
                  {selfie.preview ? (
                    <div className={styles.uploadPreviewWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selfie.preview} alt="Selfie preview" className={styles.uploadPreview} />
                      <div className={styles.uploadOverlay}>
                        {selfie.uploading && <span className={styles.uploadingBadge}>Uploading…</span>}
                        {selfie.url && <span className={styles.uploadedBadge}>Uploaded</span>}
                        {selfie.error && <span className={styles.uploadErrorBadge}>{selfie.error}</span>}
                        <button
                          type="button"
                          className={styles.retakeBtn}
                          onClick={() => selfieRef.current?.click()}
                          disabled={selfie.uploading}
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => selfieRef.current?.click()}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      Take or upload selfie
                    </button>
                  )}
                </div>

                {/* ID photo upload */}
                <div className={styles.uploadField}>
                  <label>ID document — front of your SA ID / Smart Card</label>
                  <input
                    ref={idPhotoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={handleFileChange("id_photo", setIdPhoto)}
                  />
                  {idPhoto.preview ? (
                    <div className={styles.uploadPreviewWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={idPhoto.preview} alt="ID photo preview" className={styles.uploadPreview} />
                      <div className={styles.uploadOverlay}>
                        {idPhoto.uploading && <span className={styles.uploadingBadge}>Uploading…</span>}
                        {idPhoto.url && <span className={styles.uploadedBadge}>Uploaded</span>}
                        {idPhoto.error && <span className={styles.uploadErrorBadge}>{idPhoto.error}</span>}
                        <button
                          type="button"
                          className={styles.retakeBtn}
                          onClick={() => idPhotoRef.current?.click()}
                          disabled={idPhoto.uploading}
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => idPhotoRef.current?.click()}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <path d="M2 10h20"/>
                        <path d="M6 15h4M14 15h4"/>
                      </svg>
                      Upload ID document photo
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {step === 3 && (
              <div className={styles.stepFields}>
                <div className={styles.field}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••••"
                    value={form.password}
                    onChange={set("password")}
                  />
                  <div className={styles.strengthBar}>
                    <div
                      className={styles.strengthFill}
                      style={{
                        width: `${Math.min(100, form.password.length * 8)}%`,
                        background:
                          form.password.length < 6 ? "#e05a00" :
                          form.password.length < 10 ? "#f5a800" : "#22c55e",
                      }}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••••"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    className={form.confirmPassword && form.confirmPassword !== form.password ? styles.fieldError : ""}
                  />
                  {form.confirmPassword && form.confirmPassword !== form.password && (
                    <span className={styles.errorMsg}>Passwords don&apos;t match</span>
                  )}
                </div>
                <p className={styles.terms}>
                  By registering you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </p>
              </div>
            )}

            <div className={styles.actionRow}>
              {step > 0 && (
                <button className={styles.btnBack} onClick={handleBack} disabled={isLoading}>
                  ← Back
                </button>
              )}
              <button
                className={`${styles.btnPrimary}${step === 0 ? " " + styles.btnFull : ""}`}
                onClick={handleNext}
                disabled={isLoading || selfie.uploading || idPhoto.uploading}
              >
                {isLoading ? "Creating account…" : step < 3 ? "Continue" : "Create account"}
              </button>
            </div>

            {step === 0 && (
              <>
                <div className={styles.divider}>or</div>
                <button className={styles.btnGoogle} onClick={handleGoogle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </button>
              </>
            )}
          </div>

          <p className={styles.footerLink}>
            Already have an account? <a href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Sign in</a>
          </p>
        </div>

        {/* ── Right: showcase ── */}
        <div className={styles.right}>
          <div className={styles.shapes}>
            <div className={styles.gearRing} />
            <div className={styles.gearAccent} />
            <div className={styles.hex} />
            <div className={styles.diag} />
            <div className={`${styles.bolt} ${styles.b1}`} />
            <div className={`${styles.bolt} ${styles.b2}`} />
            <div className={`${styles.bolt} ${styles.b3}`} />
          </div>

          <div className={styles.statsMock}>
            <div className={styles.statsHeader}>
              <span className={styles.screenTitleLabel}>Your earnings</span>
              <div className={styles.dotsRow}>
                <div className={`${styles.dot} ${styles.dotR}`} />
                <div className={`${styles.dot} ${styles.dotY}`} />
                <div className={`${styles.dot} ${styles.dotG}`} />
              </div>
            </div>
            <div className={styles.statsBody}>
              <div className={styles.statBig}>
                <span className={styles.statAmount}>R 4,280</span>
                <span className={styles.statPeriod}>this month</span>
              </div>
              <div className={styles.barChart}>
                {[38, 62, 45, 80, 55, 90, 72].map((h, i) => (
                  <div key={i} className={styles.bar} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className={styles.statRows}>
                <div className={styles.statRow}>
                  <span className={styles.statIcon}>🚛</span>
                  <div className={styles.statText}>
                    <div className={styles.statLine} style={{ width: "68%" }} />
                    <div className={styles.statLineSub} />
                  </div>
                  <span className={styles.statBadge}>+R 1,200</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statIcon}>🏗️</span>
                  <div className={styles.statText}>
                    <div className={styles.statLine} style={{ width: "52%" }} />
                    <div className={styles.statLineSub} />
                  </div>
                  <span className={styles.statBadge}>+R 3,080</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.slideContent}>
            <p className={styles.slideEyebrow}>ToolShare — for the trades</p>
            <p className={styles.slideTitle}>{slides[activeSlide].title}</p>
            <p className={styles.slideSub}>{slides[activeSlide].subtitle}</p>
            <div className={styles.slideDots}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.slideDot}${i === activeSlide ? " " + styles.active : ""}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div key={`${activeSlide}-${tick}`} className={styles.progressBar} />
        </div>

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
