import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/services/auth.service";
import { validateSAId } from "@/lib/utils/sa-id";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, surname, email, idNumber, password } = body;

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

    const idValidation = validateSAId(idNumber);
    if (!idValidation.valid) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
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
