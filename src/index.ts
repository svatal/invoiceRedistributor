import * as fs from "fs";
import customers from "../data/customers.json";
import { printGroupSummary } from "./config";
import {
  drawGroupSummary,
  drawName,
  drawSummary,
  getPages,
  IOutPageDef,
  reorderPages,
} from "./pdf";
import {
  categorize,
  roundingErrorPlaceholder,
  unknownGroupName,
} from "./processor";
import { forEachAsync, isDefined, keys, sanitize } from "./utils";
import { parse } from "./xml";

// customers.json is in form:
/*
{
    "groupName1": {
        "vs": number, // userId or something
        "numbers": [
            555123456,
            555123457
        ]
    },
    "groupName2": ...
}
 */

const phoneNumberToGroup = keys(customers).reduce((obj, groupName) => {
  customers[groupName].numbers.forEach(
    (phoneNumber) => (obj[phoneNumber.toString()] = groupName)
  );
  return obj;
}, {} as { [key: string]: string | undefined });

const dir = "./data";
const fileNames = fs
  .readdirSync(dir)
  .filter((f) => /.*-s\.xml/.test(f))
  .filter((_, i, a) => i === a.length - 1) // last one is enough - comment this line if you want all invoices to be processed
  .map((f) => `${dir}/${f}`);

forEachAsync(fileNames, async (fn) => {
  const parsed = parse(fn);
  const { billingPeriod } = parsed.summary.summaryHead;
  const period = `${billingPeriod.from} - ${billingPeriod.to}`;
  console.log(period);
  const subscribers = parsed.summary.subscribers.subscriber;

  const categorized = categorize(subscribers, phoneNumberToGroup);

  const pdfFN = fn.replace(/-s\.xml/, "-fs.pdf");
  const pagesInSource = await getPages(
    pdfFN,
    subscribers.map((s) => s.phoneNumber)
  );
  //   console.log(pagesInSource);
  const presentCustomerNames = keys(customers).filter(
    (name) => categorized[name]
  );
  keys(customers)
    .filter((name) => !categorized[name])
    .forEach((n) =>
      console.log(`No phone number for group "${n}" appeared at all!"`)
    );
  if (categorized[unknownGroupName]) {
    keys(categorized[unknownGroupName]!.numbers).forEach((phoneNumber) =>
      console.error(`Unknown phone number "${phoneNumber}"`)
    );
  }

  let resultPages: IOutPageDef[] = [];
  resultPages.push((p) =>
    drawSummary(
      p,
      period,
      presentCustomerNames
        .map((name) => categorized[name]!.sum)
        .reduce((a, b) => a + b),
      presentCustomerNames.map((name) => ({
        vs: customers[name].vs,
        sum: categorized[name]!.sum,
        name: sanitize(name),
      }))
    )
  );
  presentCustomerNames.forEach((groupName) => {
    const def = customers[groupName];
    const prices = categorized[groupName]!;
    if (printGroupSummary)
      resultPages.push((p) =>
        drawGroupSummary(p, sanitize(groupName), period, prices)
      );
    def.numbers
      .map((n) => {
        const pages = pagesInSource[n];
        if (!pages && n !== +roundingErrorPlaceholder)
          console.log(
            `Number ${n} from the group "${phoneNumberToGroup[n]}" not found in the documents!`
          );
        return pages;
      })
      .filter(isDefined)
      .forEach((pages, numberPos) => {
        for (let i = 0; i < pages.count; i++)
          resultPages.push(
            printGroupSummary
              ? pages.first + i
              : [
                  pages.first + i,
                  (p) =>
                    drawName(
                      p,
                      sanitize(groupName),
                      numberPos === 0 && i === 0 ? prices.sum : undefined
                    ),
                ]
          );
      });
  });
  reorderPages(
    pdfFN,
    pdfFN.replace("-fs.pdf", "-fs-reordered.pdf"),
    resultPages
  );
});
