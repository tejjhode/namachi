import { NextResponse } from "next/server";
import { sendEmailViaSMTP, sendWhatsAppViaAPI } from "@/lib/notifications/delivery";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

    // Parse absolute origin from incoming request URL to dynamically resolve relative static assets (like brochures)
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    // 1. Compile the rich HTML template
    let htmlContent = "";
    if (email) {
      htmlContent = await compileHtmlTemplate({ type, title, contentText, source_id, origin });
    }

    // Load the user's custom email banner as an inline attachment
    let imageBuffer: Buffer | null = null;
    try {
      const bannerPath = path.join(process.cwd(), "public", "images", "email-banner.png");
      if (fs.existsSync(bannerPath)) {
        imageBuffer = fs.readFileSync(bannerPath);
      }
    } catch (err) {
      console.warn("Failed to read email-banner.png for inline attachment:", err);
    }

    const attachments = [];
    if (imageBuffer) {
      attachments.push({
        filename: "email-banner.png",
        content: imageBuffer,
        cid: "email_banner",
        contentType: "image/png",
        disposition: "inline"
      });
    }

    if (email) {
      emailSent = await sendEmailViaSMTP({
        to: email,
        subject: title,
        body: contentText,
        html: htmlContent || undefined,
        priority: priority || "Medium",
        type: type || "System Alert",
        attachments: attachments.length > 0 ? attachments : undefined
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
  origin?: string;
}): Promise<string> {
  const { type, source_id, title, origin } = params;
  
  let travelerName = "Traveler";
  let tripTitle = "";
  let enquiryId = "";
  let managerName = "";
  let brochureUrl = "";
  let leadData: any = null;

  // Fetch data from Supabase based on the notification event category
  try {
    if (source_id) {
      if (type === "Welcome to Nomichi") {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", source_id)
          .single();
        if (profile) {
          travelerName = profile.full_name;
        }
      } else {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("*, trips(*)")
          .eq("id", source_id)
          .single();

        leadData = lead;

        if (lead) {
          travelerName = lead.name;
          enquiryId = lead.enquiry_id || "";
          
          if (lead.trips) {
            tripTitle = lead.trips.title;
            brochureUrl = lead.trips.brochure_url || "";
          }

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

  // Resolve brochure relative URL to absolute URL
  if (brochureUrl && brochureUrl.startsWith("/") && origin) {
    brochureUrl = `${origin}${brochureUrl}`;
  }

  // We now use a static custom email banner for all emails, so tripImageUrl resolution is skipped.

  // Select HTML body content based on notification event type
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
      <p>We’re thrilled to have you join a community of travelers who believe that the best journeys are about more than destinations—they’re about the people you meet, the stories you collect, and the memories you create along the way.</p>
      <p>Your account has been successfully created and your traveler profile is now set up.</p>
      
      <h3 style="font-size: 14px; font-weight: 800; color: #1e1e1e; margin-top: 25px; margin-bottom: 8px;">Your Travel Profile</h3>
      <p style="margin-top: 0;">We’ve saved your preferences so we can recommend journeys that match your travel style.</p>

      <h3 style="font-size: 14px; font-weight: 800; color: #1e1e1e; margin-top: 25px; margin-bottom: 12px;">What Happens Next?</h3>
      
      <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.5;">
        <strong>🌍 Explore Unique Journeys</strong><br/>
        <span style="color: #666666;">Discover carefully curated experiences across mountains, beaches, wildlife reserves, cultural hotspots, and hidden gems.</span>
      </div>
      
      <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.5;">
        <strong>🤝 Connect With Like-Minded Travelers</strong><br/>
        <span style="color: #666666;">Join small groups of people who share similar interests and travel styles.</span>
      </div>
      
      <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.5;">
        <strong>✈️ Get Personalized Recommendations</strong><br/>
        <span style="color: #666666;">We’ll suggest trips based on your travel preferences and interests.</span>
      </div>
      
      <div style="margin-bottom: 20px; font-size: 13px; line-height: 1.5;">
        <strong>❤️ Save Trips You Love</strong><br/>
        <span style="color: #666666;">Create your wishlist and keep track of adventures you’re dreaming about.</span>
      </div>

      <h4 style="font-size: 13px; font-weight: 800; color: #1e1e1e; margin-top: 25px; margin-bottom: 15px; text-align: center;">Ready to Start Exploring?</h4>
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://nomichii.vercel.app/?view=home" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Explore Trips &rarr;</a>
      </div>

      <p style="font-style: italic; color: #555555; margin-top: 25px; border-top: 1px dashed #e7e1d5; padding-top: 15px;">
        Travel isn’t just about where you go. It’s about discovering new perspectives, building meaningful connections, and finding places that feel like they were waiting for you all along.
      </p>
      <p>We’re excited to be part of your journey.</p>
      
      <div style="font-size: 11px; color: #888888; border-top: 1px solid #e7e1d5; padding-top: 15px; margin-top: 25px; line-height: 1.6;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e1e1e;">Need help getting started?</p>
        <p style="margin: 0 0 4px 0;">📧 support@nomichi.com</p>
        <p style="margin: 0 0 12px 0;">🌐 <a href="https://nomichii.vercel.app/view?=home" style="color: #FF5B26; text-decoration: none;">nomichii.vercel.app</a></p>
        <p style="margin: 0; font-style: italic;">Follow us for travel inspiration and community stories.</p>
      </div>
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
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>${params.contentText}</p>
    `;
  }

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
    .header-logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 900;
      color: #b04b1e;
      letter-spacing: 0.05em;
      line-height: 1;
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
  <!-- Preheader Text for Email Client Preview -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; color: #ffffff; line-height: 1px;">
    ${type === "Welcome to Nomichi" ? "Your profile is ready. Adventure, connection, and unforgettable experiences await." : title}
  </div>
  <div class="wrapper">
    <div class="container">
      <!-- Header Banner -->
      <div class="header">
        <span class="header-logo-text">Nomichi</span>
        <span class="header-tagline">Wander &bull; Connect &bull; Belong</span>
      </div>

      <!-- Custom Nomichi Email Banner (Embedded Inline CID) -->
      <img src="cid:email_banner" alt="Nomichi" class="trip-banner" />

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

// Maps trip title to a verified, working public Unsplash URL (status 200)
function getPublicTripImageUrl(tripTitle: string, dbImageUrl: string | null): string {
  // If the db image URL is a valid public HTTPS URL and does not contain localhost,
  // and is not the known broken Unsplash photo ID, we can use it directly.
  if (dbImageUrl && dbImageUrl.startsWith("http") && !dbImageUrl.includes("localhost") && !dbImageUrl.includes("photo-1540959733332-eab4deceeaf7")) {
    return dbImageUrl;
  }

  // Otherwise, map the trip title to a verified public Unsplash URL
  const t = (tripTitle || "").toLowerCase();
  if (t.includes("tokyo") || t.includes("fuji") || t.includes("japan")) {
    return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80";
  }
  if (t.includes("swiss") || t.includes("alps") || t.includes("zermatt")) {
    return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80";
  }
  if (t.includes("kanha") || t.includes("tiger") || t.includes("safari") || t.includes("wilderness")) {
    return "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&w=600&q=80";
  }
  if (t.includes("spiti") || t.includes("valley") || t.includes("expedition")) {
    return "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80";
  }
  if (t.includes("bali") || t.includes("paradise") || t.includes("tropical")) {
    return "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80";
  }
  if (t.includes("kerala") || t.includes("backwaters") || t.includes("hills")) {
    return "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80";
  }

  // Default brand fallback
  return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80";
}
