import * as fs from "fs";
import { PDFDocument, PDFFont, PDFPage, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import { forEachAsync } from "./utils";

interface IPages {
  [number: string]: { first: number; count: number };
}

export async function getPages(
  fileName: string,
  numbers: string[]
): Promise<IPages> {
  let results: IPages = {};
  let prev: { first: number; text: string } | undefined = undefined;
  try {
    const doc = await pdfjs.getDocument(fileName).promise;
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
      const page = await doc.getPage(pageNo);
      const lookingForIdx: number =
        Object.keys(results).length + (prev === undefined ? 0 : 1);
      const searchText = numbers[lookingForIdx]!;
      const altSearchText = addSpacing(searchText);
      const tokenizedText = await page.getTextContent();
      const found = tokenizedText.items.some(
        (token) =>
          "str" in token &&
          (token.str === searchText || token.str === altSearchText)
      );
      if (found) {
        if (prev !== undefined) {
          results[prev.text] = {
            first: prev.first - 1 /* pdf-lib has 1-based pages */,
            count: pageNo - prev.first,
          };
        }
        prev = { first: pageNo, text: searchText };
        if (numbers.length === Object.keys(results).length + 1) {
          results[prev.text] = {
            first: prev.first - 1,
            count: doc.numPages + 1 - prev.first,
          };
          return results;
        }
      }
    }
  } catch (e) {
    console.log(e);
    throw e;
  }
  throw `PDF search: found only ${Object.keys(results).length} numbers ot of ${
    numbers.length
  }. ${numbers[Object.keys(results).length]} not found.`;
}

function addSpacing(input: string) {
  return input.replace(/^(.{3})(.{3})(.{3})$/, "$1 $2 $3");
}

export async function reorderPages(
  fileName: string,
  targetFileName: string,
  pages: (number | ((p: PDFPage, f: PDFFont) => void))[]
) {
  const bytes = fs.readFileSync(fileName);
  const origDoc = await PDFDocument.load(bytes);
  const targetDoc = await PDFDocument.create();
  targetDoc.registerFontkit(fontkit);
  // monospaced font should be used - otherwise the left-padding displaying of numbers should be changed to
  // actually measure the expected results and hope for the best
  const font = await targetDoc.embedFont(fs.readFileSync("./font/luximr.ttf"));

  await forEachAsync(pages, async (p) => {
    if (typeof p == "number") {
      const [page] = await targetDoc.copyPages(origDoc, [p]);
      targetDoc.addPage(page);
    } else {
      const page = targetDoc.addPage();
      page.setFont(font);
      p(page, font);
    }
  });
  const outBytes = await targetDoc.save();
  fs.writeFileSync(targetFileName, outBytes);
}

const lineSize = 12;
const top = 800;
const x = 50;

export function drawSummary(
  page: PDFPage,
  period: string,
  sum: number,
  s: { vs: number; sum: number; name: string }[]
) {
  page.setFontSize(10);
  page.drawText(period, { x: x, y: top });
  const staticLines = 2;
  s.forEach((line, idx) => {
    const y = top - lineSize * (idx + staticLines);
    page.drawText(line.vs.toString(), { x: x, y });
    page.drawText(formatNumber(line.sum), { x: x + 40, y });
    page.drawText(line.name, { x: x + 100, y });
    page.drawLine({
      start: { x, y: y - 2 },
      end: { x: x + 150, y: y - 2 },
      thickness: 0.5,
    });
  });
  page.drawText(formatNumber(sum), {
    x: x + 40,
    y: top - lineSize * (s.length + staticLines),
  });
}

function formatNumber(price: number) {
  const s = price.toFixed(2);
  return " ".repeat(8 - s.length) + s;
}

export function drawGroupSummary(
  page: PDFPage,
  name: string,
  period: string,
  s: {
    sum: number;
    numbers: {
      [phoneNumber: string]: number;
    };
  }
) {
  page.setFontSize(10);
  page.drawText(period, { x, y: top });
  page.drawText(name, { x, y: top - lineSize * 2 });
  const staticLines = 3;
  Object.keys(s.numbers).forEach((n, idx) => {
    const price = s.numbers[n]!;
    const y = top - lineSize * (idx + staticLines);
    page.drawText(n, { x, y });
    page.drawText(formatNumber(price), { x: x + 60, y });
  });
  const y = top - lineSize * (Object.keys(s.numbers).length + staticLines);
  page.drawLine({
    start: { x: x + 60, y: y + 10 },
    end: { x: x + 110, y: y + 10 },
    thickness: 0.5,
  });
  page.drawText(formatNumber(s.sum), { x: x + 60, y });
}
