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
      { name: "buoy", type: "string" },
      { name: "buddies", type: "multiple" },
      { name: "status", type: "string", defaultValue: "pending" },
      { name: "pulley", type: "bool" },
      { name: "extraBottomWeight", type: "bool" },
      { name: "bottomPlate", type: "bool" },
      { name: "largeBuoy", type: "bool" },
      { name: "room", type: "string" },
      { name: "lanes", type: "multiple" },
      { name: "O2OnBuoy", type: "bool" },
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
