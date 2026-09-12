import type {
  userAddressesTable,
  userProfilesTable,
  usersTable,
} from "./schemas";

// ---------------------------------------------------------
// User Types
// ---------------------------------------------------------
export type UserSelectType = typeof usersTable.$inferSelect;
export type UserInsertType = typeof usersTable.$inferInsert;

export type UserProfileSelectType = typeof userProfilesTable.$inferSelect;
export type UserProfileInsertType = typeof userProfilesTable.$inferInsert;

export type UserAddressSelectType = typeof userAddressesTable.$inferSelect;
export type UserAddressInsertType = typeof userAddressesTable.$inferInsert;
