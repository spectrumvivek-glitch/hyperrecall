import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

import { getUncachableRevenueCatClient } from "./revenueCatClient";

const PROJECT_NAME = "Recallify";

const APP_STORE_APP_NAME = "Recallify (iOS)";
const APP_STORE_BUNDLE_ID = "com.recallify.app";
const PLAY_STORE_APP_NAME = "Recallify (Android)";
const PLAY_STORE_PACKAGE_NAME = "com.recallify.app";

const ENTITLEMENT_IDENTIFIER = "recallify_pro";
const ENTITLEMENT_DISPLAY_NAME = "Recallify Pro";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

interface ProductSpec {
  identifier: string;
  playStoreIdentifier: string;
  displayName: string;
  userFacingTitle: string;
  /** RevenueCat duration enum or null for non-subscription (lifetime) */
  duration: "P1W" | "P1M" | "P2M" | "P3M" | "P6M" | "P1Y" | null;
  /** Product type for RevenueCat */
  type: "subscription" | "non_consumable";
  packageIdentifier: string;
  packageDisplayName: string;
  prices: { amount_micros: number; currency: string }[];
}

const PRODUCTS: ProductSpec[] = [
  {
    identifier: "recallify_monthly",
    playStoreIdentifier: "recallify_monthly:monthly",
    displayName: "Recallify Pro Monthly",
    userFacingTitle: "Recallify Pro (Monthly)",
    duration: "P1M",
    type: "subscription",
    packageIdentifier: "$rc_monthly",
    packageDisplayName: "Monthly Subscription",
    prices: [
      { amount_micros: 4990000, currency: "USD" },
      { amount_micros: 4490000, currency: "EUR" },
    ],
  },
  {
    identifier: "recallify_yearly",
    playStoreIdentifier: "recallify_yearly:yearly",
    displayName: "Recallify Pro Yearly",
    userFacingTitle: "Recallify Pro (Yearly)",
    duration: "P1Y",
    type: "subscription",
    packageIdentifier: "$rc_annual",
    packageDisplayName: "Yearly Subscription",
    prices: [
      { amount_micros: 29990000, currency: "USD" },
      { amount_micros: 26990000, currency: "EUR" },
    ],
  },
  {
    identifier: "recallify_lifetime",
    playStoreIdentifier: "recallify_lifetime",
    displayName: "Recallify Pro Lifetime",
    userFacingTitle: "Recallify Pro (Lifetime)",
    duration: null,
    type: "non_consumable",
    packageIdentifier: "$rc_lifetime",
    packageDisplayName: "Lifetime Access",
    prices: [
      { amount_micros: 79990000, currency: "USD" },
      { amount_micros: 71990000, currency: "EUR" },
    ],
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ─── Project ────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (error) throw new Error("Failed to create project: " + JSON.stringify(error));
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ─── Apps ───────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) {
    throw new Error("No apps found");
  }

  let app: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!app) throw new Error("No test_store app found");
  console.log("Test store app:", app.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: APP_STORE_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (error) throw new Error("Failed to create App Store app: " + JSON.stringify(error));
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: "play_store",
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (error) throw new Error("Failed to create Play Store app: " + JSON.stringify(error));
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ─── Products ───────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProductForApp = async (
    targetApp: App,
    label: string,
    productIdentifier: string,
    isTestStore: boolean,
    spec: ProductSpec,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === productIdentifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} ${spec.identifier} already exists:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: productIdentifier,
      app_id: targetApp.id,
      type: spec.type,
      display_name: spec.displayName,
    };

    if (isTestStore) {
      if (spec.type === "subscription" && spec.duration) {
        body.subscription = { duration: spec.duration };
      }
      body.title = spec.userFacingTitle;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error)
      throw new Error(`Failed to create ${label} ${spec.identifier}: ` + JSON.stringify(error));
    console.log(`Created ${label} ${spec.identifier}:`, created.id);
    return created;
  };

  type ProductTrio = {
    spec: ProductSpec;
    testStoreProduct: Product;
    appStoreProduct: Product;
    playStoreProduct: Product;
  };

  const trios: ProductTrio[] = [];
  for (const spec of PRODUCTS) {
    const testStoreProduct = await ensureProductForApp(
      app,
      "Test Store",
      spec.identifier,
      true,
      spec,
    );
    const appStoreProduct = await ensureProductForApp(
      appStoreApp,
      "App Store",
      spec.identifier,
      false,
      spec,
    );
    const playStoreProduct = await ensureProductForApp(
      playStoreApp,
      "Play Store",
      spec.playStoreIdentifier,
      false,
      spec,
    );
    trios.push({ spec, testStoreProduct, appStoreProduct, playStoreProduct });

    // Test-store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testStoreProduct.id },
      body: { prices: spec.prices },
    });
    if (priceError) {
      if (
        priceError &&
        typeof priceError === "object" &&
        "type" in priceError &&
        (priceError as any).type === "resource_already_exists"
      ) {
        console.log(`  Test-store prices already exist for ${spec.identifier}`);
      } else {
        throw new Error(
          "Failed to add test-store prices for " + spec.identifier + ": " + JSON.stringify(priceError),
        );
      }
    } else {
      console.log(`  Set test-store prices for ${spec.identifier}`);
    }
  }

  // ─── Entitlement (Recallify Pro) ────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const findEnt = () =>
    existingEntitlements.items?.find(
      (e: any) =>
        e.lookup_key === ENTITLEMENT_IDENTIFIER ||
        e.id === ENTITLEMENT_IDENTIFIER ||
        e.display_name === ENTITLEMENT_DISPLAY_NAME,
    );
  let existingEnt = findEnt();
  if (!existingEnt) {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: ENTITLEMENT_IDENTIFIER,
        display_name: ENTITLEMENT_DISPLAY_NAME,
      },
    });
    if (error && (error as any).type !== "resource_already_exists") {
      throw new Error("Failed to create entitlement: " + JSON.stringify(error));
    }
    if (newEnt) {
      console.log("Created entitlement:", newEnt.id);
      entitlement = newEnt;
    } else {
      const { data: refetched } = await listEntitlements({
        client,
        path: { project_id: project.id },
        query: { limit: 100 },
      });
      const found = refetched?.items?.find(
        (e: any) =>
          e.lookup_key === ENTITLEMENT_IDENTIFIER || e.id === ENTITLEMENT_IDENTIFIER,
      );
      if (!found) throw new Error("Could not refetch entitlement");
      console.log("Entitlement already exists (refetched):", found.id);
      entitlement = found;
    }
  } else {
    console.log("Entitlement already exists:", existingEnt.id);
    entitlement = existingEnt;
  }

  // Attach all products to entitlement
  const allProductIds = trios.flatMap((t) => [
    t.testStoreProduct.id,
    t.appStoreProduct.id,
    t.playStoreProduct.id,
  ]);
  const { error: attachEntError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntError) {
    if (attachEntError.type === "unprocessable_entity_error") {
      console.log("Some products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement: " + JSON.stringify(attachEntError));
    }
  } else {
    console.log("Attached products to entitlement");
  }

  // ─── Offering ───────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOff = existingOfferings.items?.find(
    (o: any) => o.lookup_key === OFFERING_IDENTIFIER || o.id === OFFERING_IDENTIFIER,
  );
  if (existingOff) {
    console.log("Offering already exists:", existingOff.id);
    offering = existingOff;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: OFFERING_IDENTIFIER,
        display_name: OFFERING_DISPLAY_NAME,
      },
    });
    if (error && (error as any).type !== "resource_already_exists") {
      throw new Error("Failed to create offering: " + JSON.stringify(error));
    }
    if (newOff) {
      console.log("Created offering:", newOff.id);
      offering = newOff;
    } else {
      const { data: refetched } = await listOfferings({
        client,
        path: { project_id: project.id },
        query: { limit: 100 },
      });
      const found = refetched?.items?.find(
        (o: any) => o.lookup_key === OFFERING_IDENTIFIER || o.id === OFFERING_IDENTIFIER,
      );
      if (!found) throw new Error("Could not refetch offering");
      console.log("Offering already exists (refetched):", found.id);
      offering = found;
    }
  }

  if (!offering.is_current) {
    await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    console.log("Set offering as current");
  }

  // ─── Packages ───────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (const trio of trios) {
    const existingPkg = existingPackages.items?.find(
      (p) => p.lookup_key === trio.spec.packageIdentifier,
    );
    let pkgId: string;
    if (existingPkg) {
      console.log(`Package ${trio.spec.packageIdentifier} already exists:`, existingPkg.id);
      pkgId = existingPkg.id;
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: {
          lookup_key: trio.spec.packageIdentifier,
          display_name: trio.spec.packageDisplayName,
        },
      });
      if (error)
        throw new Error("Failed to create package " + trio.spec.packageIdentifier + ": " + JSON.stringify(error));
      console.log(`Created package ${trio.spec.packageIdentifier}:`, newPkg.id);
      pkgId = newPkg.id;
    }

    const { error: attachPkgError } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkgId },
      body: {
        products: [
          { product_id: trio.testStoreProduct.id, eligibility_criteria: "all" },
          { product_id: trio.appStoreProduct.id, eligibility_criteria: "all" },
          { product_id: trio.playStoreProduct.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgError) {
      if (
        attachPkgError.type === "unprocessable_entity_error" &&
        (attachPkgError as any).message?.includes("Cannot attach product")
      ) {
        console.log(`  Skipping ${trio.spec.packageIdentifier} attach (incompatible product)`);
      } else if (attachPkgError.type === "unprocessable_entity_error") {
        console.log(`  Some products already attached to ${trio.spec.packageIdentifier}`);
      } else {
        throw new Error(
          "Failed to attach products to package " + trio.spec.packageIdentifier + ": " + JSON.stringify(attachPkgError),
        );
      }
    } else {
      console.log(`  Attached products to ${trio.spec.packageIdentifier}`);
    }
  }

  // ─── API keys ───────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: app.id },
  });
  const { data: appStoreKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  const { data: playStoreKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });

  console.log("\n====================");
  console.log("RevenueCat seed complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", app.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement Identifier:", ENTITLEMENT_IDENTIFIER);
  console.log("Test Store Public Key:", testKeys?.items?.[0]?.key ?? "N/A");
  console.log("App Store Public Key:", appStoreKeys?.items?.[0]?.key ?? "N/A");
  console.log("Play Store Public Key:", playStoreKeys?.items?.[0]?.key ?? "N/A");
  console.log("====================\n");
}

seedRevenueCat().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
