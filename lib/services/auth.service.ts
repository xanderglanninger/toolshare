import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";

export interface RegisterInput {
  name: string;
  surname: string;
  email: string;
  idNumber: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    surname: string;
    email: string;
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  try {
    // Check if email already exists
    const existingEmail = await db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingEmail) {
      return { success: false, error: "An account with this email already exists." };
    }

    // Check if ID number already exists
    const existingId = await db.user.findUnique({
      where: { idNumber: input.idNumber },
    });

    if (existingId) {
      return { success: false, error: "An account with this ID number already exists." };
    }

    // Hash the password
    const password = await bcrypt.hash(input.password, 12);

    const user = await db.user.create({
      data: {
        name: input.name,
        surname: input.surname,
        email: input.email.toLowerCase(),
        idNumber: input.idNumber,
        password,
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname ?? "",
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return { success: false, error: "Invalid email or password." };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password." };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname ?? "",
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}