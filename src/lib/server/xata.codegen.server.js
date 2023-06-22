// Generated by Xata Codegen 0.22.3. Please do not edit.
import { buildClient } from "@xata.io/client";
/** @typedef { import('./types').SchemaTables } SchemaTables */
/** @type { SchemaTables } */
const tables = [
  {
    name: "Reservations",
    columns: [
      { name: "owTime", type: "string" },
      { name: "resType", type: "string" },
      { name: "numStudents", type: "int" },
      { name: "maxDepth", type: "int" },
      { name: "comments", type: "text" },
      { name: "user", type: "link", link: { table: "Users" } },
      { name: "startTime", type: "string" },
      { name: "endTime", type: "string" },
      { name: "category", type: "string" },
      {
        name: "createdAt",
        type: "datetime",
        notNull: true,
        defaultValue: "now",
      },
      { name: "date", type: "string" },
      { name: "owner", type: "bool", defaultValue: "true" },
      { name: "buddies", type: "multiple" },
      { name: "status", type: "string", defaultValue: "pending" },
      { name: "pulley", type: "bool" },
      { name: "extraBottomWeight", type: "bool" },
      { name: "bottomPlate", type: "bool" },
      { name: "largeBuoy", type: "bool" },
      { name: "lanes", type: "multiple" },
      { name: "O2OnBuoy", type: "bool" },
      { name: "buoy", type: "string", defaultValue: "auto" },
      { name: "room", type: "string", defaultValue: "auto" },
      { name: "price", type: "int" },
      {
        name: "updatedAt",
        type: "datetime",
        notNull: true,
        defaultValue: "now",
      },
    ],
  },
  {
    name: "Users",
    columns: [
      { name: "name", type: "string" },
      {
        name: "status",
        type: "string",
        notNull: true,
        defaultValue: '"disabled"',
      },
      { name: "facebookId", type: "string", unique: true },
      { name: "privileges", type: "string", defaultValue: "normal" },
      { name: "nickname", type: "string", unique: true },
    ],
  },
  {
    name: "Sessions",
    columns: [
      {
        name: "createdAt",
        type: "datetime",
        notNull: true,
        defaultValue: "now",
      },
      { name: "user", type: "link", link: { table: "Users" } },
      { name: "viewMode", type: "string", defaultValue: "normal" },
    ],
  },
  {
    name: "Settings",
    columns: [
      { name: "name", type: "string" },
      { name: "value", type: "string" },
      {
        name: "startDate",
        type: "string",
        notNull: true,
        defaultValue: "default",
      },
      {
        name: "endDate",
        type: "string",
        notNull: true,
        defaultValue: "default",
      },
    ],
  },
  {
    name: "Buoys",
    columns: [
      { name: "name", type: "string" },
      { name: "maxDepth", type: "int" },
      { name: "pulley", type: "bool" },
      { name: "extraBottomWeight", type: "bool" },
      { name: "bottomPlate", type: "bool" },
      { name: "largeBuoy", type: "bool" },
    ],
  },
  { name: "Boats", columns: [{ name: "assignments", type: "text" }] },
  {
    name: "Notifications",
    columns: [
      { name: "message", type: "text" },
      { name: "checkboxMessage", type: "text" },
    ],
  },
  {
    name: "NotificationReceipts",
    columns: [
      { name: "user", type: "link", link: { table: "Users" } },
      { name: "notification", type: "link", link: { table: "Notifications" } },
    ],
  },
  {
    name: "PriceTemplates",
    columns: [
      { name: "coachOW", type: "int" },
      { name: "coachPool", type: "int" },
      { name: "coachClassroom", type: "int" },
      { name: "autoOW", type: "int" },
      { name: "autoPool", type: "int" },
      { name: "cbsOW", type: "int" },
    ],
  },
  {
    name: "UserPriceTemplates",
    columns: [
      { name: "user", type: "link", link: { table: "Users" } },
      {
        name: "priceTemplate",
        type: "link",
        link: { table: "PriceTemplates" },
      },
      { name: "startDate", type: "string", defaultValue: "default" },
      { name: "endDate", type: "string", defaultValue: "default" },
    ],
  },
];
/** @type { import('../../client/src').ClientConstructor<{}> } */
const DatabaseClient = buildClient();
const defaultOptions = {
  databaseURL:
    "https://Michael-Horgan-s-workspace-pmg7q5.us-west-2.xata.sh/db/superhome-scheduler",
};
/** @typedef { import('./types').DatabaseSchema } DatabaseSchema */
/** @extends DatabaseClient<DatabaseSchema> */
export class XataClient extends DatabaseClient {
  constructor(options) {
    super({ ...defaultOptions, ...options }, tables);
  }
}
let instance = undefined;
/** @type { () => XataClient } */
export const getXataClient = () => {
  if (instance) return instance;
  instance = new XataClient();
  return instance;
};
