import { defineRelations } from "drizzle-orm";
import {
  userAddressesTable,
  userProfilesTable,
  usersTable,
} from "../schemas";

export const userRelations = defineRelations(
  {
    usersTable,
    userProfilesTable,
    userAddressesTable,
  },
  (r) => ({
    usersTable: {
      profile: r.one.userProfilesTable({
        from: r.usersTable.id,
        to: r.userProfilesTable.user_id,
      }),
      addresses: r.many.userAddressesTable({
        from: r.usersTable.id,
        to: r.userAddressesTable.user_id,
      }),
    },
    userProfilesTable: {
      user: r.one.usersTable({
        from: r.userProfilesTable.user_id,
        to: r.usersTable.id,
      }),
    },
    userAddressesTable: {
      user: r.one.usersTable({
        from: r.userAddressesTable.user_id,
        to: r.usersTable.id,
      }),
    },
  })
);
