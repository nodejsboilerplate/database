import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import {
  userAddressesTable,
  userProfilesTable,
  usersTable,
} from "../schemas";
import { pgDb } from "@/libs/db.connect";
import { and, eq, getColumns, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type {
  CreateUserAddressInputType,


  CreateUserWithProfileByProviderInputType,
  CreateUserWithProfileInputType,
  UpdateAddressInputType,
  UpdateProfileInputType,
} from "@/zod";
import { validate as isUUID } from "uuid";

// ---------------------------------------------------------
// Prepared Statements
// ---------------------------------------------------------

const prepareGetUserIdByEmail = pgDb.query.usersTable
  .findFirst({
    columns: {
      id: true,
    },
    where: {
      email: { eq: sql.placeholder("email") },
    },
  })
  .prepare("GetUserIdByEmail");

const prepareGetAuthUserProfileById = pgDb.query.usersTable
  .findFirst({
    columns: {
      id: true,
      email: true,
      username: true,
      role: true,
      created_at: true,
      updated_at: true,
      is_verified: true,
      provider: true,
    },
    where: {
      id: { eq: sql.placeholder("id") },
    },
    with: {
      profile: {
        columns: {
          first_name: true,
          last_name: true,
          avatar: true,
          cover_img: true,
          nickname: true,
          created_at: true,
          date_of_birth: true,
          gender: true,
          updated_at: true,
        },
      },
    },
  })
  .prepare("GetAuthUserProfileById");

const prepareGetUserVerifyDetails = pgDb.query.usersTable
  .findFirst({
    where: {
      id: {
        eq: sql.placeholder("user_id"),
      },
    },
    columns: {
      id: true,
      is_verified: true,
      verify_code: true,
      verify_expiry: true,
    },
  })
  .prepare("GetUserVerifyDetails");

export class UserRepository {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async CreateNewUserAndProfile(data: CreateUserWithProfileInputType) {
    const { user: user_payload, profile: profile_payload } = data;
    const result = await pgDb.transaction(async (tx) => {
      const { password, ...userWithoutPass } = getColumns(usersTable);
      const [user] = await tx
        .insert(usersTable)
        .values(user_payload)
        .returning(userWithoutPass);

      if (!user?.id) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("USER_CREATION_FAILED")
        );
      }

      const hashedPassword = await bcrypt.hash(user_payload.password, 10);

      await tx
        .update(usersTable)
        .set({ password: hashedPassword })
        .where(eq(usersTable.id, user.id));

      const [createdUserProfie] = await tx
        .insert(userProfilesTable)
        .values({
          ...profile_payload,
          user_id: user.id,
          date_of_birth: profile_payload.date_of_birth
            ? profile_payload.date_of_birth.toISOString().split("T")[0]
            : undefined,
        })
        .returning();

      if (!createdUserProfie?.id) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("PROFILE_CREATION_FAILED")
        );
      }

      return { user: user, profile: createdUserProfie };
    });

    return result;
  }

  async CreateNewUserAndProfileByProvider(
    data: CreateUserWithProfileByProviderInputType
  ) {
    const { user: user_payload, profile: profile_payload } = data;
    const result = await pgDb.transaction(async (tx) => {
      const { password, ...userWithoutPass } = getColumns(usersTable);
      const [user] = await tx
        .insert(usersTable)
        .values(user_payload)
        .returning(userWithoutPass);

      if (!user?.id) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("USER_CREATION_FAILED")
        );
      }

      const [createdUserProfie] = await tx
        .insert(userProfilesTable)
        .values({
          ...profile_payload,
          user_id: user.id,
          date_of_birth: profile_payload.date_of_birth
            ? profile_payload.date_of_birth.toISOString().split("T")[0]
            : undefined,
        })
        .returning();

      if (!createdUserProfie?.id) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("PROFILE_CREATION_FAILED")
        );
      }

      return { ...user, profile: createdUserProfie };
    });

    return result;
  }

  async CreateNewAddress(data: CreateUserAddressInputType) {
    const [newAddress] = await pgDb
      .insert(userAddressesTable)
      .values(data)
      .returning({ id: userAddressesTable.id });

    return newAddress;
  }

  // ---------------------------------------------------------
  // Read
  // ---------------------------------------------------------

  async GetUserIdByEmail(email: string) {
    return await prepareGetUserIdByEmail.execute({
      email,
    });
  }

  async GetAuthUserProfileById(id: string) {
    return await prepareGetAuthUserProfileById.execute({
      id,
    });
  }

  async GetUserDataForLoginByEmailOrUsernameOrId(data: string) {
    const result = await pgDb.query.usersTable.findFirst({
      columns: {
        id: true,
        email: true,
        password: true,
        username: true,
        role: true,
        is_verified: true,
      },
      with: {
        profile: {
          columns: {
            avatar: true,
            first_name: true,
            last_name: true,
            nickname: true,
          },
        },
      },
      where: {
        OR: [
          {
            email: { eq: data },
          },
          {
            username: { eq: data },
          },
          ...(isUUID(data) ? [{ id: { eq: data } }] : []),
        ],
      },
    });
    return result;
  }

  async GetUserVerifyDetails(user_id: string) {
    const user = await prepareGetUserVerifyDetails.execute({
      user_id,
    });

    return user;
  }

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------

  async UpdateUserProfile(data: UpdateProfileInputType) {
    const { date_of_birth, user_id, ...updateData } = data;

    const [updatedProfile] = await pgDb
      .update(userProfilesTable)
      .set({
        ...updateData,
        date_of_birth: date_of_birth
          ? date_of_birth.toISOString().split("T")[0]
          : undefined,
      })
      .where(and(eq(userProfilesTable.user_id, user_id)))
      .returning({ id: userProfilesTable.id });

    return updatedProfile;
  }


  async UpdateUserVerifyDetails(user_id: string) {
    const [verifiedUser] = await pgDb
      .update(usersTable)
      .set({
        is_verified: true,
        verify_code: null,
        verify_expiry: null,
      })
      .where(eq(usersTable.id, user_id))
      .returning({
        id: usersTable.id,
      });

    return verifiedUser;
  }

  async UpdateAddress(data: UpdateAddressInputType) {
    const { user_id, id, ...updateData } = data;

    const [updatedAddress] = await pgDb
      .update(userAddressesTable)
      .set(updateData)
      .where(
        and(
          eq(userAddressesTable.user_id, user_id),
          eq(userAddressesTable.id, id)
        )
      )
      .returning({ id: userAddressesTable.id });
    return updatedAddress;
  }

  async SetVerifyCodeForCoreUser(code: string, expiry: Date, email: string) {
    const [user] = await pgDb
      .update(usersTable)
      .set({
        verify_code: code,
        verify_expiry: expiry,
      })
      .where(eq(usersTable.email, email))
      .returning({
        id: usersTable.id,
      });

    return user;
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async DeleteUserById(id: string) {
    const [deletedUser] = await pgDb
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    return deletedUser;
  }

  async DeleteSingleAddress(address_id: string, user_id: string) {
    const [deletedAddress] = await pgDb
      .delete(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.id, address_id),
          eq(userAddressesTable.user_id, user_id)
        )
      )
      .returning({ id: userAddressesTable.id });

    return deletedAddress;
  }
}
