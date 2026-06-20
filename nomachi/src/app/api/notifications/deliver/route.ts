import { NextResponse } from "next/server";
import { sendEmailViaSMTP, sendWhatsAppViaAPI } from "@/lib/notifications/delivery";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, title, body: contentText, priority, type } = body;

    let emailSent = false;
    let waSent = false;

    if (email) {
      emailSent = await sendEmailViaSMTP({
        to: email,
        subject: title,
        body: contentText,
        priority: priority || "Medium",
        type: type || "System Alert"
      });
    }

    if (phone) {
      waSent = await sendWhatsAppViaAPI({
        phone,
        message: `${title}: ${contentText}`,
        priority: priority || "Medium",
        type: type || "System Alert"
      });
    }

    return NextResponse.json({ success: true, emailSent, waSent });
  } catch (error: any) {
    console.error("API notification delivery failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
