import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";
import {
  computeTrialState,
  getOrInitTrialStart,
  TrialState,
  TRIAL_DURATION_DAYS,
} from "@/lib/trial";

const ENTITLEMENT_ID = "recallify_pro";

const API_KEY = (() => {
  if (Platform.OS === "ios") return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
})();

const isExpoGo = Constants.appOwnership === "expo";
const isNativeRuntime = Platform.OS !== "web" && !isExpoGo;

type PurchasesModule = typeof import("react-native-purchases");
type PurchasesPackage = import("react-native-purchases").PurchasesPackage;
type CustomerInfo = import("react-native-purchases").CustomerInfo;
type PurchasesOffering = import("react-native-purchases").PurchasesOffering;

let purchasesPromise: Promise<PurchasesModule | null> | null = null;
async function loadPurchases(): Promise<PurchasesModule | null> {
  if (!isNativeRuntime) return null;
  if (!purchasesPromise) {
    purchasesPromise = import("react-native-purchases")
      .then((m) => m)
      .catch((err) => {
        console.warn("[RevenueCat] Failed to load native module:", err);
        return null;
      });
  }
  return purchasesPromise;
}

type PurchaseResult = "purchased" | "cancelled" | "error";

interface SubscriptionContextValue {
  isPro: boolean;
  isPaidPro: boolean;
  trial: TrialState;
  trialReady: boolean;
  trialDurationDays: number;
  isLoading: boolean;
  isAvailable: boolean;
  offering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  error: string | null;
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPaidPro, setIsPaidPro] = useState(false);
  const [trial, setTrial] = useState<TrialState>(() => computeTrialState(null));
  const [trialReady, setTrialReady] = useState(false);
  const [isLoading, setIsLoading] = useState(isNativeRuntime);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const startedRef = useRef(false);

  const handleCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    const active = !!info.entitlements.active[ENTITLEMENT_ID];
    setIsPaidPro(active);
  }, []);

  // Initialize trial on first launch (any platform). Re-evaluate on focus.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const startedAt = await getOrInitTrialStart();
        if (!cancelled) setTrial(computeTrialState(startedAt));
      } catch (err) {
        console.warn("[trial] init error:", err);
      } finally {
        if (!cancelled) setTrialReady(true);
      }
    })();
    // Recompute every minute so the active->expired flip is timely without app restart
    const interval = setInterval(() => {
      setTrial((prev) => (prev.startedAt ? computeTrialState(prev.startedAt) : prev));
    }, 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Initialize SDK once on native runtime
  useEffect(() => {
    if (!isNativeRuntime || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const Purchases = await loadPurchases();
      if (!Purchases) {
        setIsLoading(false);
        return;
      }
      try {
        if (!API_KEY) {
          setError("RevenueCat API key not configured");
          setIsLoading(false);
          return;
        }
        Purchases.default.setLogLevel(Purchases.LOG_LEVEL.WARN);
        await Purchases.default.configure({ apiKey: API_KEY });
        Purchases.default.addCustomerInfoUpdateListener(handleCustomerInfo);
        setIsConfigured(true);

        const [info, offerings] = await Promise.all([
          Purchases.default.getCustomerInfo(),
          Purchases.default.getOfferings(),
        ]);
        handleCustomerInfo(info);
        setOffering(offerings.current ?? null);
        setError(null);
      } catch (err: any) {
        console.warn("[RevenueCat] init error:", err);
        setError(err?.message ?? "Failed to initialize subscriptions");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [handleCustomerInfo]);

  // Identify user with RevenueCat when auth changes (only after configure())
  useEffect(() => {
    if (!isNativeRuntime || !isConfigured) return;
    (async () => {
      const Purchases = await loadPurchases();
      if (!Purchases) return;
      try {
        if (user?.uid) {
          const { customerInfo: info } = await Purchases.default.logIn(user.uid);
          handleCustomerInfo(info);
        } else {
          await Purchases.default.logOut().catch(() => {});
          const info = await Purchases.default.getCustomerInfo();
          handleCustomerInfo(info);
        }
      } catch (err) {
        console.warn("[RevenueCat] logIn/logOut error:", err);
      }
    })();
  }, [user?.uid, isConfigured, handleCustomerInfo]);

  const refresh = useCallback(async () => {
    if (!isNativeRuntime) return;
    const Purchases = await loadPurchases();
    if (!Purchases) return;
    setIsLoading(true);
    try {
      const [info, offerings] = await Promise.all([
        Purchases.default.getCustomerInfo(),
        Purchases.default.getOfferings(),
      ]);
      handleCustomerInfo(info);
      setOffering(offerings.current ?? null);
      setError(null);
    } catch (err: any) {
      console.warn("[RevenueCat] refresh error:", err);
      setError(err?.message ?? "Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  }, [handleCustomerInfo]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
      if (!isNativeRuntime) return "error";
      const Purchases = await loadPurchases();
      if (!Purchases) return "error";
      try {
        const { customerInfo: info } = await Purchases.default.purchasePackage(pkg);
        handleCustomerInfo(info);
        return "purchased";
      } catch (err: any) {
        if (err?.userCancelled) return "cancelled";
        console.warn("[RevenueCat] purchase error:", err);
        setError(err?.message ?? "Purchase failed");
        return "error";
      }
    },
    [handleCustomerInfo],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isNativeRuntime) return false;
    const Purchases = await loadPurchases();
    if (!Purchases) return false;
    try {
      const info = await Purchases.default.restorePurchases();
      handleCustomerInfo(info);
      return !!info.entitlements.active[ENTITLEMENT_ID];
    } catch (err: any) {
      console.warn("[RevenueCat] restore error:", err);
      setError(err?.message ?? "Restore failed");
      return false;
    }
  }, [handleCustomerInfo]);

  const isPro = isPaidPro || trial.isActive;

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro,
      isPaidPro,
      trial,
      trialReady,
      trialDurationDays: TRIAL_DURATION_DAYS,
      isLoading,
      isAvailable: isNativeRuntime,
      offering,
      packages: offering?.availablePackages ?? [],
      customerInfo,
      error,
      refresh,
      purchasePackage,
      restorePurchases,
    }),
    [isPro, isPaidPro, trial, trialReady, isLoading, offering, customerInfo, error, refresh, purchasePackage, restorePurchases],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used inside SubscriptionProvider");
  return ctx;
}
