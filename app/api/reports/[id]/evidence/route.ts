import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addDisputeEvidence } from "@/lib/services/report.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: reportId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl, fileType, description } = await req.json();
    if (!fileUrl || !fileType) {
      return NextResponse.json({ error: "fileUrl and fileType are required" }, { status: 400 });
    }

    const evidence = await addDisputeEvidence({
      reportId,
      uploaderId: session.user.id,
      fileUrl,
      fileType,
      description: description ?? undefined,
    });

    return NextResponse.json({ data: evidence }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to submit evidence" },
      { status: 400 }
    );
  }
}
