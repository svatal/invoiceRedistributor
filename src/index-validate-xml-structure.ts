import * as fs from "fs";
import { toArray } from "./utils";
import { parse } from "./xml";

const dir = "./data";
const fileNames = fs
  .readdirSync(dir)
  .filter((f) => /.*-s\.xml/.test(f))
  .map((f) => `${dir}/${f}`);

// validates we know about all price components
for (const fn of fileNames) {
  console.log(fn);
  const parsed = parse(fn);
  for (const subscriber of parsed.summary.subscribers.subscriber) {
    const s = subscriber.summaryData;
    const total2 = [
      s.oneTimeCharges?.otcItem,
      s.regularCharges?.rcItem,
      ...toArray(s.usageCharges?.usageCharge).map((uc) => uc.ucItem),
      s.additionalServices?.asItem,
      ...toArray(s.payments?.payment).map((p) => p.paymentItem),
      s.discounts?.discountItem,
    ]
      .map((maybeArray) => toArray(maybeArray))
      .flat()
      .reduce(
        (c, item) =>
          c + +(isWithoutTax(item) ? item.price : item.priceWithoutTax),
        0
      );
    check(subscriber.summaryPrice, total2);
  }
}

function isWithoutTax<T1 extends { price: unknown }, T2>(
  item: T1 | T2
): item is T1 {
  return "price" in item;
}

function check(total1: string, total2: number) {
  console.log("**** total ****", total1, total2);
  if (`${(+total1).toFixed(2)}` !== `${total2.toFixed(2)}`) throw "nesedi";
}
