import { NextResponse } from "next/server";
import { sendEmailViaSMTP, sendWhatsAppViaAPI } from "@/lib/notifications/delivery";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client using the service role key to bypass RLS checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, title, body: contentText, priority, type, source_id } = body;

    let emailSent = false;
    let waSent = false;

    // Rich HTML Template Compiler
    let htmlContent = "";
    if (email) {
      htmlContent = await compileHtmlTemplate({ type, title, contentText, source_id });
    }

    if (email) {
      emailSent = await sendEmailViaSMTP({
        to: email,
        subject: title,
        body: contentText,
        html: htmlContent || undefined,
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

// Helper to compile responsive, high-fidelity HTML emails
async function compileHtmlTemplate(params: {
  type: string;
  title: string;
  contentText: string;
  source_id?: string;
}): Promise<string> {
  const { type, source_id, title } = params;
  
  let travelerName = "Traveler";
  let tripTitle = "";
  let tripImage = "";
  let enquiryId = "";
  let managerName = "";
  let brochureUrl = "";

  // 1. Fetch data from Supabase based on the notification event category
  try {
    if (source_id) {
      if (type === "Welcome to Nomichi") {
        // Welcome registration flow (source_id = profile user_id)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", source_id)
          .single();
        if (profile) {
          travelerName = profile.full_name;
        }
      } else {
        // Enquiry, Manager Assignment, or Brochure Shared flow (source_id = lead UUID)
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("*, trips(*)")
          .eq("id", source_id)
          .single();

        if (lead) {
          travelerName = lead.name;
          enquiryId = lead.enquiry_id || "";
          
          if (lead.trips) {
            tripTitle = lead.trips.title;
            tripImage = lead.trips.image_url || "";
            brochureUrl = lead.trips.brochure_url || "";
          }

          // Fetch assigned manager if present
          if (lead.assigned_to) {
            const { data: manager } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", lead.assigned_to)
              .single();
            if (manager) {
              managerName = manager.full_name;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Template compiler database query fallback:", err);
  }

  // 2. Select HTML body content based on notification event type
  let bodyContent = "";
  const firstName = travelerName.split(" ")[0] || travelerName;

  if (type === "Enquiry Submitted") {
    const finalTripTitle = tripTitle || "your selected trip";
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>Thank you for showing interest in our <strong>${finalTripTitle}</strong> experience.</p>
      <p>We’re excited that you’re considering traveling with Nomichi.</p>
      <p>Your enquiry has been successfully received and is now being reviewed by our travel specialists.</p>
      <p>Over the next few hours, one of our trip experts will carefully review your request and reach out to understand:</p>
      <ul style="padding-left: 20px; line-height: 1.6; margin: 15px 0;">
        <li>Your travel preferences</li>
        <li>Group size and expectations</li>
        <li>Preferred travel dates</li>
        <li>Any special requirements</li>
      </ul>
      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 18px; border-radius: 16px; margin: 25px 0; font-size: 13px; line-height: 1.6; color: #1e1e1e;">
        <strong>Trip:</strong> ${finalTripTitle}<br/>
        <strong>Enquiry ID:</strong> ${enquiryId || "ENQ-" + Math.floor(1000 + Math.random() * 9000)}
      </div>
      <p>At Nomichi, we believe travel is more than visiting destinations. It’s about meaningful experiences, authentic connections, and unforgettable stories.</p>
      <p>We’ll be in touch shortly.</p>
    `;
  } else if (type === "Welcome to Nomichi") {
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>Welcome to Nomichi.</p>
      <p>We’re excited to have you join a growing community of curious travelers who believe journeys should be personal, meaningful, and memorable.</p>
      <p>Your account has been successfully created, and you’re now ready to explore experiences designed around connection, culture, and adventure.</p>
      <p>What you can do next:</p>
      <ul style="padding-left: 20px; line-height: 1.6; margin: 15px 0;">
        <li>Discover upcoming journeys</li>
        <li>Save trips to your wishlist</li>
        <li>Submit enquiries and connect with our team</li>
        <li>Track your bookings and travel plans</li>
        <li>Build your travel profile and preferences</li>
      </ul>
      <p>At Nomichi, we don’t just plan trips.</p>
      <p>We create opportunities to wander beyond the obvious, connect with incredible people, and belong to experiences that stay with you long after you return home.</p>
      <p>Whether it’s watching the sunrise over the Himalayas, exploring hidden villages, chasing the northern lights, or sharing stories around a campfire, we’re excited to be part of your journey.</p>
      <p>Your adventure starts now.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nomachi.travel" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Explore Journeys &rarr;</a>
      </div>
      <p style="font-size: 11px; color: #888; border-top: 1px solid #e7e1d5/50; padding-top: 15px; margin-top: 25px;">Need help getting started? Reply to this email and our team will be happy to assist.</p>
    `;
  } else if (type === "Manager Assigned") {
    const finalTripTitle = tripTitle || "your trip enquiry";
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>Great news!</p>
      <p>Your enquiry has been assigned to one of our travel experts who will personally guide you through the planning process.</p>
      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 18px; border-radius: 16px; margin: 25px 0; font-size: 13px; line-height: 1.6; color: #1e1e1e;">
        <strong>Your Trip Expert:</strong> ${managerName || "Ananya Mehta"}<br/>
        <strong>Interested Trip:</strong> ${finalTripTitle}
      </div>
      <p>Your trip expert will help with:</p>
      <ul style="padding-left: 20px; line-height: 1.6; margin: 15px 0;">
        <li>Trip planning & pricing</li>
        <li>Itinerary guidance</li>
        <li>Accommodation details</li>
        <li>Group information</li>
        <li>Travel preparation</li>
      </ul>
      <p>You may receive a call, WhatsApp message, or email shortly.</p>
      <p>We’re looking forward to helping you create an unforgettable journey.</p>
    `;
  } else if (type === "Brochure Shared") {
    const finalTripTitle = tripTitle || "your requested trip";
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>We’ve prepared your trip brochure and itinerary details.</p>
      <p>Here is what you will find inside:</p>
      <ul style="padding-left: 20px; line-height: 1.6; margin: 15px 0;">
        <li>Trip highlights & route map</li>
        <li>Day-by-day itinerary walkthrough</li>
        <li>Accommodation & meal details</li>
        <li>Inclusions and exclusions checklist</li>
        <li>Pricing information & billing</li>
        <li>Frequently asked questions</li>
      </ul>
      <p>Take your time exploring the details.</p>
      ${
        brochureUrl
          ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${brochureUrl}" target="_blank" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">View Itinerary Brochure &rarr;</a>
      </div>
      `
          : ""
      }
      <p>If you have any questions, simply reply to this email or connect with your Nomichi Trip Expert.</p>
      <p>Adventure awaits.</p>
    `;
  } else {
    // Default system alert template
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>${params.contentText}</p>
    `;
  }

  // 3. Wrap body inside a responsive, premium HTML wrapper
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background-color: #FAF8F4;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #FAF8F4;
      padding: 40px 15px;
    }
    .container {
      background-color: #ffffff;
      border: 1px solid #e7e1d5;
      border-radius: 24px;
      max-width: 600px;
      margin: 0 auto;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(231, 225, 213, 0.25);
    }
    .header {
      background-color: #ffffff;
      border-bottom: 1px solid #e7e1d5/40;
      padding: 30px 25px;
      text-align: center;
    }
    .header-logo {
      height: 38px;
      width: auto;
      display: inline-block;
    }
    .header-tagline {
      display: block;
      font-size: 8px;
      font-weight: 800;
      color: #FF5B26;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      margin-top: 10px;
    }
    .trip-banner {
      width: 100%;
      height: 240px;
      object-fit: cover;
      display: block;
      border-bottom: 1px solid #e7e1d5/30;
    }
    .content {
      padding: 40px 30px;
      color: #1a1a1a;
      font-size: 14px;
      line-height: 1.65;
    }
    .footer {
      border-top: 1px solid #e7e1d5/40;
      padding: 25px;
      text-align: center;
      background-color: #FAF8F4;
      font-size: 11px;
      color: #888888;
      line-height: 1.5;
    }
    .signature {
      margin-top: 35px;
      border-top: 1px dashed #e7e1d5;
      padding-top: 25px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header Banner -->
      <div class="header">
        <img src="https://agdyqujsdnxiuwcpuupw.supabase.co/storage/v1/object/public/trips/logo.png" alt="Nomichi Logo" class="header-logo" />
        <span class="header-tagline">Wander &bull; Connect &bull; Belong</span>
      </div>

      <!-- Dynamic Trip Hero Image Banner -->
      ${tripImage ? `<img src="${tripImage}" alt="${tripTitle}" class="trip-banner" />` : ""}

      <!-- Main Body content -->
      <div class="content">
        ${bodyContent}
        
        <div class="signature">
          Warm regards,<br/>
          <strong>Team Nomichi</strong><br/>
          <span style="font-size: 9px; color: #FF5B26; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 6px; display: inline-block;">Wander &bull; Connect &bull; Belong</span>
        </div>
      </div>
      
      <!-- Footer details -->
      <div class="footer">
        &copy; ${new Date().getFullYear()} Nomichi Travels. All rights reserved.<br/>
        Wander &bull; Connect &bull; Belong<br/>
        You received this email because you registered or submitted an enquiry at nomachi.travel.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return emailHtml;
}
