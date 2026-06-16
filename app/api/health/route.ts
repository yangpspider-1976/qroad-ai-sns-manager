import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "qroad-ai-sns-manager",
    mockPublishing: process.env.MOCK_PUBLISHING !== "false",
    approvalRequired: process.env.REQUIRE_APPROVAL_BEFORE_PUBLISH !== "false"
  });
}
