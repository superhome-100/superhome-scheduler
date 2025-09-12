import { buildClient } from '@xata.io/client';

const XATA_API_KEY = "xau_hpPd74YrDAv6MpxmkvqT57REO2uJeTwo1";
const FIREBASE_SERVICE_ACCOUNT_KEY = '{"type":"service_account","project_id":"freedive-superhome","private_key_id":"287e2130adae7eab207bfc5302b4d055a3354e7f","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCTRBDH65kzw4OW\\nz8KRt58rDMDzhSMbL7qDrYTPvSPwNjAz6dOM5VPKLS0R8azNioXPxbFtzueTjYkV\\n9SK5gx3pSeOW8GL2Ir6WokcxYG+GfyP3dm1eUT90i9bYtHnZNk7t2d7kc210jtBH\\nVtoX5+2nK2pBu9R39oET+vFvqZCrgoyZb6Tkl1b/UNDECpxmGJB1NdYA2JpNeueb\\nTxII0wyyJ9qQd0NI7mNvx8/mjjuNpJsTEP7QeSed8KjilBot1jy92EBgsBS+p125\\nnkP4oSRl2PnNV4GkpNnrzFjq6ijYVQqZNIviLCTlNFuUVx5aKq/TdHrVszLuihPU\\nS4QV5Id/AgMBAAECggEAAXZaQ6OLbrzJgPQI2fArmwLL19SIPs9MJv/Yy5nScCsp\\nDD2V7RZn4CjEv15vFTUl0zWCtGyItL8U8eXn4lU7Vxq55HP4SkMzdcCX5rdiQw2r\\naWSefTOjRLPVCyc7oINOLN7KALdVG3nSoZEeDI4fDaO8FzWbssyWZTP2V5UToOp6\\nUq7t/4sZD4tEgusHq0HhJKTtNcnHOVp8PCFvhqRdY6A0XywDDEg5aZVE2eMFOTOt\\nMvB1ADnIvAY5n7hsYv00I4YG/HuMYpSJ6aPYGfyGdUejaH9pR0FblJxBJDiHnWea\\nrQClHhbwDhydt4BmyHHXcFmDiGs7EcIGMnD6nirWxQKBgQDIZmy9Pi7nkA9RaQUe\\nXe+iWa5LCRZC0Jn2DA1+I9PHEHowj/jeMxt1UqNvUAD7Wxb76STy59hMFr/NG6N9\\nSrIf9cRARIxAUL8ZZHAMtw7wfP67vTHdwSUrmpIRKrpkiGRB2hEyoFoJzMT2L9lw\\nJTLBoCnP76xan+lHm99BbqGQ1QKBgQC8H726tc3INFefg3v1N/Mq7Z7ctPDz5a9l\\nJ74gYUvj/BR+wJNXWG85Fu8ZkuQygxrRwnQgubQpeuF7Mm7BLa17z94Jo5S3izfP\\nxNOGYSYwUJAEE9ZRSqR5a4FD7nkG2+YAA6F/mSfzUXKSOy25n3/0k5w4+a8WBSjz\\nsLBzFjMBAwKBgQCWI4acUZY6jserKo9XLPF4JNBcDzbKYBa5LFZ/hsAHh+TDtVmy\\nv3926q7fmoThzGDv4sB37BM1DmYseOSH3gqNv0eFDtY06UoC8CiyngNnUX5XkWtm\\nxGngvTFqAyUaZMUYQRRZZaGPbgaymy7Awl3AiwpIazwpuVzA9ZrSHtyU8QKBgDbW\\nidgDZxkVKPW2vkudI6U/3y83D4YJTjeOfj2yHw02TkMkn862WLWrmcc6qoqO7SJ4\\nLKHdgEcXKuNesCpfxlJxJahpptBaJMrL9V0WtKsg0NpfbfoEaC18yRGkUmNNdp5K\\ncKlhW+PxuhQmbA3QENyaqs9w+TjSCD4BI25o6jVBAoGAPa/20d5PLyDgP9+73f6t\\nvxToDes5n75wz0eaWxBCLqI5vo42I1iNXla3CYVjmY99PwiP5NpBwm6QlP51nGz6\\nCu5RToGJswVc7LDzYOSueevoYgFaGvVQwD5VrMeFb0vXPw0QjK+BRHkFI2/1RFql\\nqmwhr+FQmrzUaxb0wO18gJI=\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-k5z3e@freedive-superhome.iam.gserviceaccount.com","client_id":"105817035023667697199","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-k5z3e%40freedive-superhome.iam.gserviceaccount.com","universe_domain":"googleapis.com"}';
const XATA_BRANCH = "dev";
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
        defaultValue: "now"
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
        defaultValue: "now"
      },
      {
        name: "shortSession",
        type: "bool",
        notNull: true,
        defaultValue: "false"
      },
      {
        name: "allowAutoAdjust",
        type: "bool",
        notNull: true,
        defaultValue: "true"
      }
    ]
  },
  {
    name: "Users",
    columns: [
      { name: "name", type: "string" },
      {
        name: "status",
        type: "string",
        notNull: true,
        defaultValue: '"disabled"'
      },
      { name: "facebookId", type: "string", unique: true },
      { name: "privileges", type: "string", defaultValue: "normal" },
      { name: "nickname", type: "string", unique: true },
      { name: "googleId", type: "string" },
      { name: "email", type: "string" },
      { name: "firebaseUID", type: "string" }
    ],
    revLinks: [
      { column: "", table: "Reservations" },
      { column: "", table: "Sessions" },
      { column: "user", table: "NotificationReceipts" },
      { column: "user", table: "UserPriceTemplates" }
    ]
  },
  {
    name: "Sessions",
    columns: [
      {
        name: "createdAt",
        type: "datetime",
        notNull: true,
        defaultValue: "now"
      },
      { name: "user", type: "link", link: { table: "Users" } },
      { name: "viewMode", type: "string", defaultValue: "normal" }
    ]
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
        defaultValue: "default"
      },
      {
        name: "endDate",
        type: "string",
        notNull: true,
        defaultValue: "default"
      }
    ]
  },
  {
    name: "Buoys",
    columns: [
      { name: "name", type: "string" },
      { name: "maxDepth", type: "int" },
      { name: "pulley", type: "bool" },
      { name: "extraBottomWeight", type: "bool" },
      { name: "bottomPlate", type: "bool" },
      { name: "largeBuoy", type: "bool" }
    ]
  },
  { name: "Boats", columns: [{ name: "assignments", type: "text" }] },
  {
    name: "Notifications",
    columns: [
      { name: "message", type: "text" },
      { name: "checkboxMessage", type: "text" }
    ],
    revLinks: [{ column: "notification", table: "NotificationReceipts" }]
  },
  {
    name: "NotificationReceipts",
    columns: [
      { name: "user", type: "link", link: { table: "Users" } },
      { name: "notification", type: "link", link: { table: "Notifications" } }
    ]
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
      { name: "proSafetyOW", type: "int", defaultValue: "0" },
      { name: "platformOW", type: "int", defaultValue: "0" },
      { name: "platformCBSOW", type: "int", defaultValue: "0" },
      { name: "comp-setupOW", type: "int", defaultValue: "0" }
    ],
    revLinks: [{ column: "priceTemplate", table: "UserPriceTemplates" }]
  },
  {
    name: "UserPriceTemplates",
    columns: [
      { name: "user", type: "link", link: { table: "Users" } },
      {
        name: "priceTemplate",
        type: "link",
        link: { table: "PriceTemplates" }
      },
      { name: "startDate", type: "string", defaultValue: "default" },
      { name: "endDate", type: "string", defaultValue: "default" }
    ]
  },
  {
    name: "BuoyGroupings",
    columns: [
      { name: "comment", type: "string", notNull: true, defaultValue: "" },
      { name: "date", type: "datetime" },
      { name: "buoy", type: "string" },
      { name: "am_pm", type: "string", notNull: true, defaultValue: "am" }
    ]
  }
];
const DatabaseClient = buildClient();
const defaultOptions = {
  databaseURL: "https://Superhome-Workspace-pmg7q5.us-west-2.xata.sh/db/superhome-scheduler"
};
class XataClient extends DatabaseClient {
  constructor(options) {
    super({ ...defaultOptions, ...options }, tables);
  }
}

export { FIREBASE_SERVICE_ACCOUNT_KEY as F, XataClient as X, XATA_API_KEY as a, XATA_BRANCH as b };
//# sourceMappingURL=xata.codegen-95200588.js.map
