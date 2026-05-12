"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

type DashboardCtx = {
  userImage: string | null;
  setUserImage: (url: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  notifUnread: number;
  setNotifUnread: (n: number) => void;
  idVerificationStatus: string;
  setIdVerificationStatus: (s: string) => void;
  hasBankAccount: boolean | null;
  setHasBankAccount: (v: boolean) => void;
  showListingGate: boolean;
  setShowListingGate: (v: boolean) => void;
  isAdmin: boolean;
};

const DashboardContext = createContext<DashboardCtx>({} as DashboardCtx);
export const useDashboard = () => useContext(DashboardContext);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [notifUnread, setNotifUnread] = useState(0);
  const [idVerificationStatus, setIdVerificationStatus] = useState("unverified");
  const [hasBankAccount, setHasBankAccount] = useState<boolean | null>(null);
  const [showListingGate, setShowListingGate] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lendme-theme") as "dark" | "light" | null;
      if (stored) {
        setTheme(stored);
        if (stored === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.image) setUserImage(j.data.image);
        if (j.data?.idVerificationStatus) setIdVerificationStatus(j.data.idVerificationStatus);
      })
      .catch(() => {});
    fetch("/api/settings/bank-account")
      .then((r) => r.json())
      .then((j) => {
        const b = j.data;
        setHasBankAccount(!!(b?.bankAccountHolder && b?.bankName && b?.bankAccountNumber && b?.bankAccountType));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function fetchUnread() {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((j) => { if (j.data?.unreadCount !== undefined) setNotifUnread(j.data.unreadCount); })
        .catch(() => {});
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try { localStorage.setItem("lendme-theme", next); } catch {}
  }

  return (
    <DashboardContext.Provider value={{
      userImage, setUserImage,
      theme, toggleTheme,
      notifUnread, setNotifUnread,
      idVerificationStatus, setIdVerificationStatus,
      hasBankAccount, setHasBankAccount,
      showListingGate, setShowListingGate,
      isAdmin,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
