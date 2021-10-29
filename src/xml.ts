import * as parser from "fast-xml-parser";
import * as fs from "fs";

export interface IXml {
  summary: {
    summaryHead: {
      day: string;
      month: string;
      year: string;
      billingPeriod: {
        from: string;
        to: string;
      };
    };
    subscribers: { subscriber: ISubscriber[] };
  };
}

export interface ISubscriber {
  phoneNumber: string;
  summaryPrice: string;
  summaryPriceWithTax: string;
}

export function parse(fileName: string) {
  const xmlString = fs.readFileSync(fileName, "utf-8");
  return parser.parse(xmlString, {
    attributeNamePrefix: "",
    ignoreAttributes: false,
  }) as IXml;
}
