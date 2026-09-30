import assert from "node:assert/strict";
import test from "node:test";
import { validateCategory } from "./vision-category";

const cases: [string, Parameters<typeof validateCategory>[0], string][] = [
  ["metal water bottle", { productType: "Water Bottle", material: "Green metal" }, "Metals"],
  ["stainless steel bottle", { productType: "Bottle", material: "Stainless steel" }, "Metals"],
  ["plastic bottle", { productType: "Plastic Bottle", material: "PET" }, "Plastic"],
  ["cardboard box", { productType: "Cardboard Box" }, "Packaging Materials"],
  ["wooden furniture", { productType: "Wooden Table" }, "Wood"],
  ["copper electrical wire", { productType: "Copper electrical wire", material: "Copper" }, "Electrical Materials"],
  ["smartphone with plastic casing", { productType: "Smartphone", material: "Plastic", observations: ["Vivo phone back panel"] }, "Mobile Phones"],
  ["electric motor", { productType: "Electric motor" }, "Machinery & Equipment"],
  ["bricks", { productType: "Reusable bricks" }, "Construction Materials"],
  ["unknown", { productType: "Unrecognised object" }, "Other"],
];
for (const [name, input, expected] of cases) test(name, () => assert.equal(validateCategory(input).category, expected));
