import * as fs from "fs";
import { keys, toArray } from "./utils";
import { IUsageChargeItem, parse } from "./xml";
import customers from "../data/customers.json";
import profiles from "../data/profiles.json"; // Record<string, IProfileDefinition>

interface IProfileDefinition {
  fixedPrice: number;
  voiceMinutePrice: number;
  smsPrice: number;
}

const dir = "./data";
const fileNames = fs
  .readdirSync(dir)
  .filter((f) => /.*-s\.xml/.test(f))
  .map((f) => `${dir}/${f}`);

interface IMonthlyPayment {
  profilePrices: Record<string, number>;
  usedProfile: string;
}
const numbers: Record<string, IMonthlyPayment[]> = {};

for (const fn of fileNames) {
  console.log(fn);
  const parsed = parse(fn);
  for (const subscriber of parsed.summary.subscribers.subscriber) {
    const s = subscriber.summaryData;
    const [usedProfile, annotherActiveProfileThisMonth] = toArray(
      s.regularCharges?.rcItem
    ).filter((i) => i.rowID === "51631003502" || i.rowID === "51631164502");

    if (
      annotherActiveProfileThisMonth !== undefined ||
      usedProfile == undefined
    )
      continue; // switching profiles, let's discard this entry
    if (!(usedProfile.feeName in profiles)) {
      console.error("unknown profile", usedProfile.feeName, keys(profiles));
    }
    const payment: IMonthlyPayment = {
      profilePrices: keys(profiles).reduce<Record<string, number>>((obj, p) => {
        obj[p] = profiles[p].fixedPrice;
        return obj;
      }, {}),
      usedProfile: usedProfile.feeName,
    };
    toArray(s.usageCharges?.usageCharge)
      .map((uc) => toArray(uc.ucItem))
      .flat()
      .forEach((item) => {
        if (
          [
            "201", // V rámci ČR do O2
            "202", // V rámci ČR mimo O2
            "203", // Odchozí volání v rámci EU
          ].includes(item.rowID)
        ) {
          const minutes = +item.totalUnits / 60;
          updatePricesForAllProfiles(
            payment,
            item,
            usedProfile.feeName,
            (pd) => minutes * pd.voiceMinutePrice
          );
        } else if (
          [
            "221", // SMS v rámci ČR do O2
            "222", // SMS v rámci ČR mimo O2
            "223", // SMS v rámci EU
          ].includes(item.rowID)
        ) {
          const numberOfSms = +item.totalUnits;
          updatePricesForAllProfiles(
            payment,
            item,
            usedProfile.feeName,
            (pd) => numberOfSms * pd.smsPrice
          );
        } else if (
          [
            "106", // Barevné a informační linky
          ].includes(item.rowID)
        ) {
          // ignore it - these can be either free or always paid - even in all inclusive profiles
        } else if (
          [
            "205", // Hlasová schránka
            "211", // Tísňová volání
            "212", // Příchozí volání v rámci EU
            "214", // V rámci firmy
            "230", // Bezplatné SMS
            "261", // Datový provoz v ČR (kB)
            "263", // Datový provoz v rámci EU (kB)
          ].includes(item.rowID)
        ) {
          // known to be free
          if (item.priceWithoutTax !== "0.00") {
            console.log(
              "hey, this should have been free - we may have miscalculated something!",
              item
            );
          }
        } else if (item.priceWithoutTax === "0.00") {
          console.log(
            "hey, you have probably skipped a line included in full profile!",
            item
          );
        }
      });
    if (numbers[subscriber.phoneNumber] === undefined) {
      numbers[subscriber.phoneNumber] = [];
    }
    numbers[subscriber.phoneNumber]!.push(payment);
  }
}

keys(customers).forEach((c) => {
  console.log(c);
  let totalDiff = 0;
  let totalPrice = 0;
  customers[c].numbers.forEach((n) => {
    const payments = numbers[n];
    const realPrice = sum(
      payments?.map((p) => p.profilePrices[p.usedProfile]!)
    );
    console.log(" ", n);
    console.log("    real price", round(realPrice));
    const profilePrices = keys(profiles).map(
      (profileName) =>
        [
          profileName,
          sum(payments?.map((p) => p.profilePrices[profileName]!)),
        ] as const
    );
    profilePrices.forEach(([profileName, totalPrice]) =>
      console.log(`    all ${profileName}`, round(totalPrice))
    );
    const best = Math.min(...profilePrices.map(([_, price]) => price));
    const diff = realPrice - best;
    totalDiff += diff;
    totalPrice += realPrice;
    console.log("    diff", round(diff), `${round((diff / realPrice) * 100)}%`);
  });
  console.log(
    "  total diff",
    round(totalDiff),
    `${round((totalDiff / totalPrice) * 100)}%`
  );
});

function round(n: number): string {
  return n.toFixed(0);
}

function sum(ns: number[] | undefined) {
  if (ns === undefined) return 0;
  return ns.reduce((a, b) => a + b);
}

function updatePricesForAllProfiles(
  payment: IMonthlyPayment,
  item: IUsageChargeItem,
  usedProfileName: string,
  getPrice: (pd: IProfileDefinition) => number
) {
  const realPrice = +item.priceWithoutTax;
  keys(profiles).forEach((profileName) => {
    const profileDefinition = profiles[profileName];
    const computedPrice = getPrice(profileDefinition);
    payment.profilePrices[profileName] += computedPrice;
    if (
      profileName === usedProfileName &&
      Math.abs(realPrice - computedPrice) > 0.1
    ) {
      console.error(
        "too big difference",
        profileName,
        item,
        realPrice - computedPrice,
        realPrice,
        computedPrice
      );
    }
  });
}
