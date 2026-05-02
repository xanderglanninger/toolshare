import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, surname, email, idNumber, password } = body;

    // Basic validation
    if (!name || !surname || !email || !idNumber || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (idNumber.length !== 13 || !/^\d+$/.test(idNumber)) {
      return NextResponse.json(
        { error: "ID number must be 13 digits." },
        { status: 400 }
      );
    }

    const result = await registerUser({ name, surname, email, idNumber, password });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (error) {
    console.error("Register route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}