import { defineRelations } from "drizzle-orm";
import {
  userProfilesTable,
  usersTable,
} from "../schemas";

export const userRelations = defineRelations(
  {
    usersTable,
    userProfilesTable,
  },
  (r) => ({
    usersTable: {
      profile: r.one.userProfilesTable({
        from: r.usersTable.id,
        to: r.userProfilesTable.user_id,
      }),
    },
    userProfilesTable: {
      user: r.one.usersTable({
        from: r.userProfilesTable.user_id,
        to: r.usersTable.id,
      }),
    },
  })
);
