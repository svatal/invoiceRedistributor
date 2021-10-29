import * as fs from "fs";
import { PDFFont, PDFPage } from "pdf-lib";
import customers from "../data/customers.json";
import { drawGroupSummary, drawSummary, getPages, reorderPages } from "./pdf";
import { categorize } from "./processor";
import { forEachAsync, keys, sanitize } from "./utils";
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
  console.log(billingPeriod.from, "-", billingPeriod.to);
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
  let resultPages: (number | ((p: PDFPage, f: PDFFont) => void))[] = [];
  resultPages.push((p) =>
    drawSummary(
      p,
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
    resultPages.push((p) => drawGroupSummary(p, sanitize(groupName), prices));
    def.numbers.forEach((n) => {
      const pages = pagesInSource[n];
      if (pages) {
        for (let i = 0; i < pages.count; i++) resultPages.push(pages.first + i);
      } else console.log(`Number ${n} not found in the documents!`);
    });
  });
  reorderPages(
    pdfFN,
    pdfFN.replace("-fs.pdf", "-fs-reordered.pdf"),
    resultPages
  );
});
