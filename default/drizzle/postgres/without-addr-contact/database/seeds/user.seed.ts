// seed/user.seed.ts
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { usersTable, userProfilesTable } from "@/database";
import { pgDb } from "@/libs/db.connect";

import type {
  UserInsertType,
  UserProfileInsertType,
} from "../type";


interface SeedUsersOptions {
  count?: number;
}

export async function seedUsers(options: SeedUsersOptions = {}) {
  const { count = 20 } = options;

  // -- Build users
  const usersData: UserInsertType[] = Array.from({ length: count }).map(() => ({
    id: uuidv4(),
    email: faker.internet.email().toLowerCase(),
    username: faker.internet.username().toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    is_verified: true,
    role: "USER",
    provider: "MANUAL",
  }));

  const users = await pgDb.insert(usersTable).values(usersData).returning({
    id: usersTable.id,
  });

  // -- Build profiles (1:1)
  const profilesData: UserProfileInsertType[] = users.map((user) => ({
    id: uuidv4(),
    user_id: user.id,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    avatar: faker.image.avatar(),
    cover_img: faker.image.url(),
    nickname: faker.internet.username().toLowerCase(),
    date_of_birth: faker.date.birthdate().toISOString().split("T")[0],
    gender: faker.helpers.arrayElement(["MALE", "FEMALE", "OTHER"]),
  }));

  await pgDb.insert(userProfilesTable).values(profilesData).returning({
    user_id: userProfilesTable.user_id,
    first_name: userProfilesTable.first_name,
    last_name: userProfilesTable.last_name,
  });

  return { userCount: users.length };
}
