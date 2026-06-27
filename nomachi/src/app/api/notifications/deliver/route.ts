import { NextResponse } from "next/server";
import { sendEmailViaSMTP, sendWhatsAppViaAPI } from "@/lib/notifications/delivery";
import { createClient } from "@supabase/supabase-js";
import { generateBrochureToken } from "@/lib/brochure-token";
import fs from "fs";
import path from "path";

// Initialize Supabase Admin Client using the service role key to bypass RLS checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, title, body: contentText, priority, type, source_id, paymentContext } = body;

    let emailSent = false;
    let waSent = false;

    // Parse absolute origin from incoming request URL to dynamically resolve relative static assets (like brochures)
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    // 1. Compile the rich HTML template
    let htmlContent = "";
    if (email) {
      htmlContent = await compileHtmlTemplate({ type, title, contentText, source_id, origin, paymentContext });
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

    // Attach PDF brochures if it's a Brochure Shared email
    if (type === "Brochure Shared" && source_id) {
      try {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("*, trips(*)")
          .eq("id", source_id)
          .single();
        if (lead?.trips?.brochure_url) {
          const bUrl = lead.trips.brochure_url;
          if (bUrl.startsWith("[")) {
            const brochures = JSON.parse(bUrl);
            brochures.forEach((item: any, idx: number) => {
              if (item.url && item.url.startsWith("data:")) {
                const match = item.url.match(/^data:([^;]+);base64,(.*)$/);
                if (match) {
                  const contentType = match[1];
                  const base64Data = match[2];
                  const buffer = Buffer.from(base64Data, "base64");
                  attachments.push({
                    filename: item.name || `brochure_${idx + 1}.pdf`,
                    content: buffer,
                    contentType: contentType,
                    disposition: "attachment"
                  });
                }
              }
            });
          } else if (bUrl.startsWith("data:")) {
            const match = bUrl.match(/^data:([^;]+);base64,(.*)$/);
            if (match) {
              const contentType = match[1];
              const base64Data = match[2];
              const buffer = Buffer.from(base64Data, "base64");
              attachments.push({
                filename: "brochure.pdf",
                content: buffer,
                contentType: contentType,
                disposition: "attachment"
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch and attach brochures during email delivery:", err);
      }
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
  paymentContext?: Record<string, string>;
}): Promise<string> {
  const { type, source_id, title, origin, contentText, paymentContext } = params;
  
  let travelerName = "Traveler";
  let tripTitle = "";
  let enquiryId = "";
  let managerName = "";
  let brochureUrl = "";
  let brochuresListHtml = "";
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
          
          // Fetch gender and nationality from the user profile if available
          if (lead.user_id) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("gender, nationality")
              .eq("id", lead.user_id)
              .maybeSingle();
            if (profile) {
              leadData.gender = profile.gender || "Not specified";
              leadData.nationality = profile.nationality || "Indian";
            }
          }

          if (lead.trips) {
            tripTitle = lead.trips.title;
            if (lead.trips.brochure_url) {
              const bUrl = lead.trips.brochure_url;
              if (bUrl.startsWith("[")) {
                try {
                  const brochures = JSON.parse(bUrl);
                  const links = [];
                  for (let idx = 0; idx < brochures.length; idx++) {
                    const token = generateBrochureToken(lead.trips.id || lead.trip_id, idx);
                    const signedUrl = `${origin}/api/trips/${lead.trips.id || lead.trip_id}/brochure?index=${idx}&token=${token}`;
                    links.push(`
                      <div style="text-align: center; margin: 15px 0;">
                        <a href="${signedUrl}" target="_blank" style="background-color: #FF5B26; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25); text-transform: capitalize;">View: ${brochures[idx].name || `Brochure ${idx + 1}`} &rarr;</a>
                      </div>
                    `);
                  }
                  brochuresListHtml = links.join("");
                } catch (e) {
                  console.warn("Failed to parse brochure JSON in template compile:", e);
                }
              } else if (bUrl.startsWith("data:")) {
                const token = generateBrochureToken(lead.trips.id || lead.trip_id, 0);
                brochureUrl = `${origin}/api/trips/${lead.trips.id || lead.trip_id}/brochure?index=0&token=${token}`;
              } else {
                brochureUrl = bUrl;
              }
            }
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

  if (!brochuresListHtml && brochureUrl) {
    brochuresListHtml = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${brochureUrl}" target="_blank" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">View Itinerary Brochure &rarr;</a>
      </div>
    `;
  }

  // We now use a static custom email banner for all emails, so tripImageUrl resolution is skipped.

  // Select HTML body content based on notification event type
  let bodyContent = "";
  const firstName = travelerName.split(" ")[0] || travelerName;

  if (type === "Enquiry Submitted") {
    const finalTripTitle = tripTitle || "your selected trip";
    const submittedDate = leadData?.created_at 
      ? new Date(leadData.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>Thank you for your interest in <strong>${finalTripTitle}</strong>.</p>
      <p>We’re excited that you’re considering traveling with Nomichi.</p>
      <p>Your enquiry has been successfully received and is now being reviewed by our travel team.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Your Enquiry</h4>
        📍 <strong>Trip:</strong> ${finalTripTitle}<br/>
        📅 <strong>Preferred Month:</strong> ${leadData?.preferred_month || "Not specified"}<br/>
        👥 <strong>Travelers:</strong> ${leadData?.group_size || 1} ${leadData?.group_type ? `(${leadData.group_type})` : ""}<br/>
        ✨ <strong>Travel Style:</strong> ${leadData?.hope_trip_feels_like || "Not specified"}<br/>
        📝 <strong>Special Requests / Dietary / Accessibility:</strong> ${leadData?.dietary_and_accessibility || "None"}<br/>
        🆔 <strong>Enquiry ID:</strong> ${enquiryId || "N/A"}<br/>
        📨 <strong>Submitted On:</strong> ${submittedDate}
      </div>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">What Happens Next?</h4>
      <p>Our team will:</p>
      <ul style="padding-left: 20px; line-height: 1.6; margin: 15px 0;">
        <li>✅ Review your enquiry</li>
        <li>✅ Understand your travel preferences</li>
        <li>✅ Share trip details and pricing</li>
        <li>✅ Help you plan the perfect experience</li>
      </ul>
      <p>A Nomichi Trip Expert will contact you shortly via phone, WhatsApp, or email.</p>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">Why Travel With Nomichi?</h4>
      <ul style="list-style-type: none; padding-left: 0; line-height: 1.8; margin: 15px 0;">
        <li>🏔️ <strong>Curated small-group experiences</strong></li>
        <li>🤝 <strong>Like-minded travel communities</strong></li>
        <li>✨ <strong>Unique destinations and stories</strong></li>
        <li>🧭 <strong>Personalized travel guidance</strong></li>
      </ul>

      <h4 style="font-size: 13px; font-weight: 800; color: #1e1e1e; margin-top: 25px; margin-bottom: 15px; text-align: center;">Ready to Explore More?</h4>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/view?=explore" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">View Trip Details</a>
      </div>

      <p style="font-style: italic; color: #555555; margin-top: 25px; border-top: 1px dashed #e7e1d5; padding-top: 15px;">
        Adventure begins with a single step. We’re excited to help you create unforgettable memories.
      </p>
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
      <p>Great news! Your enquiry has been assigned to one of our senior travel experts who will personally guide you through the planning process.</p>
      
      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Your Trip Expert</h4>
        👤 <strong>Manager Name:</strong> ${managerName || "Ananya Mehta"}<br/>
        📍 <strong>Trip Interest:</strong> ${finalTripTitle}<br/>
        🆔 <strong>Enquiry ID:</strong> ${enquiryId || "N/A"}
      </div>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">What your expert will help with:</h4>
      <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>✨ **Tailored Itineraries:** Adjusting routes and dates to match your travel goals.</li>
        <li>🏨 **Stay & Transfers:** Clear information on accommodations and local logistics.</li>
        <li>👥 **Group Cohort Vibe:** Overview of other travelers in your cohort.</li>
        <li>💳 **Billing & Payments:** Direct support for secure booking and deposit payments.</li>
      </ul>

      <p>Your Trip Expert will reach out shortly via Call, WhatsApp, or Email to schedule an informal 10-minute briefing (Vibe Check) call.</p>
      <p>We’re looking forward to helping you plan an incredible journey!</p>
    `;
  } else if (type === "Brochure Shared") {
    const finalTripTitle = tripTitle || "your requested trip";
    const customMessageHtml = contentText
      ? `<div style="background-color: #FAF8F4; border-left: 4px solid #FF5B26; padding: 16px; border-radius: 12px; margin: 20px 0; font-family: inherit; font-size: 13px; line-height: 1.6; color: #555555; font-style: italic;">
          &ldquo;${contentText.replace(/\n/g, "<br/>")}&rdquo;
         </div>`
      : "";

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>We’ve prepared your trip brochure and detailed itinerary for <strong>${finalTripTitle}</strong>.</p>
      
      ${customMessageHtml}

      <p>Take your time exploring the route, accommodations, inclusions, and daily schedule. Here is a brief look at what is inside:</p>
      
      <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>🏔️ <strong>Day-by-Day Itinerary:</strong> Walkthrough of daily adventures and highlights.</li>
        <li>🏨 <strong>Accommodations:</strong> Stay images, standard ratings, and descriptions.</li>
        <li>🍽️ <strong>Inclusions & Exclusions:</strong> Clear breakdown of meals, transfers, and activities.</li>
        <li>💳 <strong>Pricing details:</strong> Flexible payment schedule and slots overview.</li>
      </ul>

      ${brochuresListHtml}

      <p>If you have any questions or want to customize dates/activities, simply reply to this email or contact your assigned Trip Expert, <strong>${managerName || "Team Nomichi"}</strong>.</p>
      <p>Adventure awaits!</p>
    `;
  } else if (type === "New Enquiry") {
    const finalTripTitle = tripTitle || leadData?.trip_interest || "Selected Trip";
    const submittedAt = leadData?.created_at 
      ? new Date(leadData.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    bodyContent = `
      <p>A new enquiry has been submitted through the website.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 20px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Traveler Information</h4>
        👤 <strong>Name:</strong> ${leadData?.name || "N/A"}<br/>
        📧 <strong>Email:</strong> ${leadData?.email || "N/A"}<br/>
        📞 <strong>Phone:</strong> ${leadData?.phone || "N/A"}<br/>
        ⚧️ <strong>Gender:</strong> ${leadData?.gender || "Not specified"}<br/>
        🇮🇳 <strong>Nationality:</strong> ${leadData?.nationality || "Indian"}
      </div>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 20px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Trip Request</h4>
        📍 <strong>Trip:</strong> ${finalTripTitle}<br/>
        📅 <strong>Travel Month:</strong> ${leadData?.preferred_month || "Not specified"}<br/>
        👥 <strong>Travelers:</strong> ${leadData?.group_size || 1} ${leadData?.group_type ? `(${leadData.group_type})` : ""}<br/>
        💳 <strong>Budget:</strong> ${leadData?.trips?.price ? `₹${leadData.trips.price}` : "Not specified"}<br/>
        ✨ <strong>Travel Style:</strong> ${leadData?.hope_trip_feels_like || "Not specified"}<br/>
        📝 <strong>Dietary/Accessibility:</strong> ${leadData?.dietary_and_accessibility || "None"}
      </div>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 20px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Enquiry Source</h4>
        🌐 <strong>Source:</strong> Web Portal<br/>
        🆔 <strong>Enquiry ID:</strong> ${enquiryId || "N/A"}<br/>
        📅 <strong>Timestamp:</strong> ${submittedAt}
      </div>

      <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e7e1d5; padding-top: 20px;">
        <h4 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 800; color: #1e1e1e;">Action Required</h4>
        <p style="margin-bottom: 20px;">Please assign this new enquiry to an active manager in the workspace.</p>
        <a href="${origin || 'https://nomichii.vercel.app'}/admin/enquiries" style="background-color: #FF5B26; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Open Admin Panel &rarr;</a>
      </div>
    `;
  } else if (type === "Lead Assigned") {
    const finalTripTitle = tripTitle || leadData?.trip_interest || "Selected Trip";
    bodyContent = `
      <p>Hello,</p>
      <p>A new lead has been assigned to you for management.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 20px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Lead Information</h4>
        👤 <strong>Lead Name:</strong> ${leadData?.name || "N/A"}<br/>
        📍 <strong>Interested Trip:</strong> ${finalTripTitle}<br/>
        📞 <strong>Phone:</strong> ${leadData?.phone || "N/A"}<br/>
        📧 <strong>Email:</strong> ${leadData?.email || "N/A"}<br/>
        🚩 <strong>Priority:</strong> High (Intake Checklist Pending)
      </div>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">Required Workflow Pipeline Tasks:</h4>
      <ol style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>📞 **Contact Traveler:** Introduce Nomichi & assess travel style.</li>
        <li>📁 **Share Brochure:** Dispatch itinerary brochure.</li>
        <li>💬 **Follow Up:** Evaluate traveler interest & slot vibe check call.</li>
      </ol>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/manager/leads" style="background-color: #FF5B26; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Open My Leads &rarr;</a>
      </div>
    `;
  } else if (type === "Scheduled Call") {
    const finalTripTitle = tripTitle || "your selected trip";
    let callTime = "Scheduled Date & Time";
    if (params.contentText.includes(" on ")) {
      const parts = params.contentText.split(" on ");
      if (parts.length > 1) {
        callTime = parts[1].split(".")[0];
      }
    } else {
      callTime = params.contentText;
    }

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>We're excited to connect with you! Your informal <strong>Vibe Check Call</strong> has been scheduled.</p>
      <p>This is a quick 10-15 minute voice/video call to understand your travel preferences, answer any questions about the route/accommodations, and verify group cohort compatibility.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Meeting Details</h4>
        📍 <strong>Trip:</strong> ${finalTripTitle}<br/>
        📅 <strong>Date & Time:</strong> ${callTime}<br/>
        🤝 <strong>Trip Expert:</strong> ${managerName || "Your assigned manager"}<br/>
        📞 <strong>Communication:</strong> Your expert will contact you directly on your mobile/WhatsApp.
      </div>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">What we will review:</h4>
      <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>🚶 **Pace & Fitness:** Ensure the daily trekking/walking matches your expectations.</li>
        <li>🌦️ **Weather & Stays:** Overview of weather conditions and accommodation types.</li>
        <li>👥 **Group Vibe:** Brief info about your cohort members and group dynamics.</li>
        <li>💳 **Next Steps:** Advance booking deposit details to secure your spot.</li>
      </ul>

      <p style="font-style: italic; color: #555555; margin-top: 25px; border-top: 1px dashed #e7e1d5; padding-top: 15px;">
        If you need to adjust or reschedule this call, please email us or reach out directly to your Trip Expert.
      </p>
    `;
  } else if (type === "Booking Confirmed") {
    const finalTripTitle = tripTitle || "your selected trip";
    const isManager = params.contentText.toLowerCase().includes("booking confirmed for");

    if (isManager) {
      bodyContent = `
        <p>Hello,</p>
        <p>A booking deposit has been successfully confirmed and logged in the database.</p>

        <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Booking Log</h4>
          👤 <strong>Traveler Name:</strong> ${travelerName}<br/>
          📍 <strong>Trip Interest:</strong> ${finalTripTitle}<br/>
          📞 <strong>Phone:</strong> ${leadData?.phone || "N/A"}<br/>
          📧 <strong>Email:</strong> ${leadData?.email || "N/A"}<br/>
          🆔 <strong>Enquiry Ref:</strong> ${enquiryId || "N/A"}<br/>
          💳 <strong>Advance Receipt:</strong> Verified
        </div>

        <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">Next Actions Required:</h4>
        <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
          <li>ID Collection (Step 7) & Emergency Contact Details (Step 8) are now active.</li>
          <li>Ensure traveler uploads their ID document reference copy.</li>
          <li>Confirm departure assignment (Step 9) once documents are verified.</li>
        </ul>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${origin || 'https://nomichii.vercel.app'}/manager/leads" style="background-color: #FF5B26; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Open Leads Dashboard &rarr;</a>
        </div>
      `;
    } else {
      bodyContent = `
        <p>Hi ${firstName},</p>
        <p><strong>Your spot is secured! Welcome to the cohort!</strong> 🎉</p>
        <p>We've successfully verified your booking deposit payment. Your reservation for <strong>${finalTripTitle}</strong> is active and locked in.</p>

        <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
          <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Reservation Receipt</h4>
          📍 <strong>Confirmed Trip:</strong> ${finalTripTitle}<br/>
          🤝 <strong>Trip Expert:</strong> ${managerName || "Team Nomichi"}<br/>
          💳 <strong>Deposit Payment:</strong> Received & Verified<br/>
          🆔 <strong>Booking Reference:</strong> ${enquiryId || "N/A"}
        </div>

        <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">Required Preparation Actions:</h4>
        <p>To finalize travel logistics and secure required local permits, please provide your documents:</p>
        <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
          <li>🛡️ **Upload ID Document:** Securely upload your ID copy (Passport or Aadhaar card) to your profile.</li>
          <li>📞 **Emergency Contact details:** Fill out your emergency contact person's name and phone.</li>
          <li>📅 **Departure Schedule:** Your expert will confirm your departure dates in the system.</li>
        </ul>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${origin || 'https://nomichii.vercel.app'}/login" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Complete Profile Setup</a>
        </div>

        <p style="font-style: italic; color: #555555; margin-top: 25px; border-top: 1px dashed #e7e1d5; padding-top: 15px;">
          Welcome to the family. We can't wait to wander, connect, and explore together!
        </p>
      `;
    }
  } else if (type === "Document Required") {
    const finalTripTitle = tripTitle || "your upcoming trip";
    const isId = params.contentText.toLowerCase().includes("id") || params.contentText.toLowerCase().includes("passport");

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>We hope you're excited for your upcoming journey on <strong>${finalTripTitle}</strong>!</p>
      <p>To finalize permits, reserve accommodations, and plan cohort safety briefings, we require additional info for your traveler profile.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Information Request</h4>
        📍 <strong>Trip:</strong> ${finalTripTitle}<br/>
        📁 <strong>Required Detail:</strong> ${isId ? "Government Issued ID Document Copy" : "Emergency Contact Details"}<br/>
        📝 <strong>Action Needed:</strong> ${isId ? "Please upload your ID number & clear scanned image (Passport/Aadhaar) to secure your permits." : "Please input emergency contact person name, relationship, and phone number."}
      </div>

      ${
        isId
          ? `
      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">ID Copy Guidelines:</h4>
      <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>Ensure all text is readable and image is not blurry.</li>
        <li>Must have at least 6 months validity remaining.</li>
        <li>Names must exactly match travel tickets.</li>
      </ul>
      `
          : ""
      }

      <div style="text-align: center; margin: 25px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/login" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Provide Document/Info</a>
      </div>

      <p style="font-style: italic; color: #555555; margin-top: 25px; border-top: 1px dashed #e7e1d5; padding-top: 15px;">
        Thank you for helping us keep your travel organization secure and seamless.
      </p>
    `;
  } else if (type === "Departure Assigned") {
    const finalTripTitle = tripTitle || "your selected trip";
    const depInfo = params.contentText.replace("You have been assigned to ", "");

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p>Your departure date has been officially confirmed for <strong>${finalTripTitle}</strong>!</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Departure Confirmed</h4>
        📍 <strong>Trip Name:</strong> ${finalTripTitle}<br/>
        📅 <strong>Assigned Date:</strong> ${depInfo}<br/>
        🤝 <strong>Trip Expert:</strong> ${managerName || "Team Nomichi"}<br/>
        🚩 <strong>Status:</strong> Active & Permitted
      </div>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">What to expect next:</h4>
      <p>We are mapping your stay schedules and booking transport. Keep an eye out for:</p>
      <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>📁 **Final Day-by-Day Itinerary:** Full detailed route itinerary document.</li>
        <li>💬 **Cohort chat link:** WhatsApp group invite to connect with other traveler members.</li>
        <li>🧭 **Pre-Trip briefing call:** Virtual kickoff meet details.</li>
      </ul>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/login" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Open My Travel Portal</a>
      </div>
    `;
  } else if (type === "Trip Reminder") {
    const finalTripTitle = tripTitle || "your adventure";

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p><strong>The countdown begins! 7 days left until your departure.</strong> 🎒✈️</p>
      <p>Your upcoming cohort adventure on <strong>${finalTripTitle}</strong> is starting in exactly one week. We are wrapping up ground logistics, stays, and cohort guides. Here is how you should prepare:</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 20px; border-radius: 16px; margin: 25px 0; line-height: 1.8; color: #1e1e1e;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.05em;">Departure Summary</h4>
        📍 <strong>Trip:</strong> ${finalTripTitle}<br/>
        📅 <strong>Timeline:</strong> Starts in 7 Days<br/>
        🤝 <strong>Trip Lead:</strong> ${managerName || "Team Nomichi"}
      </div>

      <h4 style="margin-top: 25px; margin-bottom: 10px; font-size: 14px; font-weight: 800; color: #1e1e1e;">Departure Checklist:</h4>
      <ul style="padding-left: 20px; line-height: 1.65; margin: 15px 0;">
        <li>💬 **Join traveler group:** Check your messages for the WhatsApp cohort group invitation link.</li>
        <li>🎒 **Review packing list:** Gather weather-appropriate apparel and trekking gear.</li>
        <li>🛡️ **Travel Insurance:** Verify you have uploaded your travel insurance document.</li>
        <li>📞 **Kickoff briefing:** Ensure you join the virtual kickoff call with other travelers.</li>
      </ul>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/login" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Review My Travel Checklist</a>
      </div>
    `;
  } else if (type === "Review Request") {
    const finalTripTitle = tripTitle || "your trip";

    bodyContent = `
      <p>Hi ${firstName},</p>
      <p><strong>Welcome back from your incredible journey!</strong> 🏔️✨</p>
      <p>We hope you returned with a backpack full of memories, new friends, and inspiring stories.</p>
      <p>Our travel community grows on experiences shared by travelers like you. We would be extremely grateful if you could take 2 minutes to rate and share your review for <strong>${finalTripTitle}</strong>.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/login" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Share Your Review &rarr;</a>
      </div>

      <p>Your honest comments help us refine itineraries, support guides, and help other travelers plan their next journeys.</p>
      <p style="font-style: italic; color: #555555; margin-top: 25px; border-top: 1px dashed #e7e1d5; padding-top: 15px;">
        Thank you for traveling with Nomichi. Wander &bull; Connect &bull; Belong!
      </p>
    `;
  } else if (type === "Payment Reminder" && paymentContext) {
    const pc = paymentContext;
    bodyContent = `
      <p>Hi ${pc.travelerName?.split(" ")[0] || "Traveler"},</p>
      <p>This is a formal reminder that the payment balance for your upcoming journey to <strong>${pc.tripTitle}</strong> is currently due.</p>

      <div style="background-color: #FAF8F4; border: 1.5px solid #e7e1d5; padding: 22px; border-radius: 18px; margin: 24px 0;">
        <h4 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 900; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 6px;">
          ⚠️ Payment Details
        </h4>
        <table style="width:100%; font-size: 13px; line-height: 1.9; color: #1e1e1e; border-collapse: collapse;">
          <tr><td style="width:45%; color:#777; font-weight:600;">Booking Reference</td><td style="font-weight:700;">${pc.bookingRef}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Trip Package</td><td style="font-weight:700;">${pc.tripTitle}${pc.tripDestination ? ` (${pc.tripDestination})` : ""}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Balance Amount Due</td><td style="font-weight:900; font-size:15px; color:#c2410c;">${pc.totalFormatted}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Payment Due Date</td><td style="font-weight:700; color:#b91c1c;">${pc.dueDateStr}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Status</td><td><span style="background:#fef3c7; color:#d97706; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:800;">PENDING PAYMENT</span></td></tr>
        </table>
      </div>

      <p>Please secure your booking slot at your earliest convenience by completing the payment online. Failure to clear the balance before the due date may result in slot cancellation or release of holds.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/?view=bookings" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">Complete Payment Online &rarr;</a>
      </div>

      <p style="font-style: italic; color: #555; font-size: 12px; border-top: 1px dashed #e7e1d5; padding-top: 15px; margin-bottom: 0;">
        If you have already processed the payment or have any queries regarding billing, please reply to this email or get in touch with your assigned Trip Expert.
      </p>
    `;
  } else if (type === "Payment Received - Traveler" && paymentContext) {
    const pc = paymentContext;
    bodyContent = `
      <p>Hi ${pc.travelerName?.split(" ")[0] || "Traveler"},</p>
      <p>Great news — your payment has been <strong>successfully received</strong> and your booking is now fully confirmed! 🎉</p>

      <div style="background: linear-gradient(135deg, #fff5f2 0%, #fff 100%); border: 1.5px solid #FF5B26; padding: 22px; border-radius: 18px; margin: 24px 0;">
        <h4 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 900; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.06em;">✅ Payment Receipt</h4>
        <table style="width:100%; font-size: 13px; line-height: 1.9; color: #1e1e1e; border-collapse: collapse;">
          <tr><td style="width:45%; color:#777; font-weight:600;">Transaction ID</td><td style="font-weight:800; font-family:monospace; color:#FF5B26;">${pc.transactionId}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Booking Reference</td><td style="font-weight:700;">${pc.bookingRef}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Trip</td><td style="font-weight:700;">${pc.tripTitle}${pc.tripDestination ? ` <span style="color:#888;font-size:11px;">(${pc.tripDestination})</span>` : ""}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Amount Paid</td><td style="font-weight:900; font-size:15px; color:#16a34a;">${pc.amountFormatted}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Payment Method</td><td style="font-weight:700;">${pc.paymentMethodLabel}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Date &amp; Time</td><td style="font-weight:700;">${pc.paidAtFormatted} IST</td></tr>
          <tr><td style="color:#777; font-weight:600;">Status</td><td><span style="background:#dcfce7; color:#16a34a; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:800;">✓ PAID IN FULL</span></td></tr>
        </table>
      </div>

      <p style="margin-top:18px;">Your journey to <strong>${pc.tripTitle}</strong> is now <strong>officially confirmed</strong>. Our team will reach out with pre-departure details, packing lists, and cohort information closer to the travel date.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 16px 20px; border-radius: 14px; margin: 20px 0; font-size: 13px; line-height: 1.7;">
        <strong>🧳 What happens next?</strong><br/>
        <ul style="padding-left: 18px; margin: 10px 0;">
          <li>You'll receive a detailed itinerary &amp; day plan</li>
          <li>Your trip leader will connect with you on WhatsApp</li>
          <li>A cohort group will be created to introduce fellow travelers</li>
          <li>Pre-departure briefing call details will be shared 1 week before</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/?view=bookings" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">View My Bookings &rarr;</a>
      </div>

      <p style="font-size: 11px; color: #888; text-align:center;">This is your official payment confirmation. Please save this email for your records.<br/>Booking Ref: <strong>${pc.bookingRef}</strong> &bull; TxnID: <strong>${pc.transactionId}</strong></p>
    `;
  } else if (type === "Payment Received - Admin" && paymentContext) {
    const pc = paymentContext;
    bodyContent = `
      <p><strong>A payment has been successfully received</strong> from the following traveler. The booking has been automatically marked as <span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:800;">PAID</span> in the system.</p>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 22px; border-radius: 16px; margin: 22px 0;">
        <h4 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 900; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.06em;">💳 Payment Summary</h4>
        <table style="width:100%; font-size: 13px; line-height: 1.9; color: #1e1e1e; border-collapse: collapse;">
          <tr><td style="width:40%; color:#777; font-weight:600;">Transaction ID</td><td style="font-weight:800; font-family:monospace; color:#FF5B26;">${pc.transactionId}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Booking Reference</td><td style="font-weight:700;">${pc.bookingRef}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Amount Received</td><td style="font-weight:900; font-size:15px; color:#16a34a;">${pc.amountFormatted}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Total Booking Value</td><td style="font-weight:700;">${pc.totalFormatted}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Payment Method</td><td style="font-weight:700;">${pc.paymentMethodLabel}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Paid At</td><td style="font-weight:700;">${pc.paidAtFormatted} IST</td></tr>
        </table>
      </div>

      <div style="background-color: #FAF8F4; border: 1px solid #e7e1d5; padding: 22px; border-radius: 16px; margin: 22px 0;">
        <h4 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 900; color: #b04b1e; text-transform: uppercase; letter-spacing: 0.06em;">👤 Traveler Details</h4>
        <table style="width:100%; font-size: 13px; line-height: 1.9; color: #1e1e1e; border-collapse: collapse;">
          <tr><td style="width:40%; color:#777; font-weight:600;">Name</td><td style="font-weight:700;">${pc.travelerName}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Email</td><td style="font-weight:700;">${pc.travelerEmail}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Phone</td><td style="font-weight:700;">${pc.travelerPhone || '—'}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Trip</td><td style="font-weight:700;">${pc.tripTitle}${pc.tripDestination ? ` (${pc.tripDestination})` : ""}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Assigned Manager</td><td style="font-weight:700;">${pc.managerName || 'Unassigned'}</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/admin/bookings" style="background-color: #1A1208; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px;">View in Admin Dashboard &rarr;</a>
      </div>

      <p style="font-size:11px; color:#888; text-align:center;">This is an automated system notification. No action required.<br/>Nomichi Admin Team</p>
    `;
  } else if (type === "Payment Received - Manager" && paymentContext) {
    const pc = paymentContext;
    bodyContent = `
      <p>Hi ${pc.managerName?.split(" ")[0] || "there"},</p>
      <p>Your client <strong>${pc.travelerName}</strong> has successfully completed their payment for the trip booking assigned to you. The booking status has been <strong>automatically updated to Paid</strong> — no action is required on your end.</p>

      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); border: 1.5px solid #16a34a; padding: 22px; border-radius: 18px; margin: 24px 0;">
        <h4 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 900; color: #15803d; text-transform: uppercase; letter-spacing: 0.06em;">🎯 Booking Update</h4>
        <table style="width:100%; font-size: 13px; line-height: 1.9; color: #1e1e1e; border-collapse: collapse;">
          <tr><td style="width:45%; color:#777; font-weight:600;">Client Name</td><td style="font-weight:700;">${pc.travelerName}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Client Email</td><td style="font-weight:700;">${pc.travelerEmail}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Trip</td><td style="font-weight:700;">${pc.tripTitle}${pc.tripDestination ? ` (${pc.tripDestination})` : ""}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Booking Ref</td><td style="font-weight:800; font-family:monospace;">${pc.bookingRef}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Amount Paid</td><td style="font-weight:900; font-size:15px; color:#16a34a;">${pc.amountFormatted}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Transaction ID</td><td style="font-family:monospace; font-size:12px; color:#FF5B26;">${pc.transactionId}</td></tr>
          <tr><td style="color:#777; font-weight:600;">Paid At</td><td style="font-weight:700;">${pc.paidAtFormatted} IST</td></tr>
          <tr><td style="color:#777; font-weight:600;">Status</td><td><span style="background:#dcfce7; color:#16a34a; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:800;">✓ PAID IN FULL</span></td></tr>
        </table>
      </div>

      <div style="background-color: #FAF8F4; border-left: 4px solid #FF5B26; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <strong>✅ No action required.</strong> The payment has been automatically recorded in the Nomichi system. The traveler has also received a payment confirmation email.
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${origin || 'https://nomichii.vercel.app'}/manager/bookings" style="background-color: #FF5B26; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 4px 10px rgba(255,91,38,0.25);">View in Manager Dashboard &rarr;</a>
      </div>

      <p style="font-size:11px; color:#888; text-align:center;">Automated notification from Nomichi &bull; Wander &bull; Connect &bull; Belong</p>
    `;
  } else {
    bodyContent = `
      <p>Hi ${firstName},</p>
      <p style="line-height: 1.7; font-size: 14px; color: #1e1e1e;">${params.contentText.replace(/\n/g, "<br/>")}</p>
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
    ${type === "Welcome to Nomichi" ? "Your profile is ready. Adventure, connection, and unforgettable experiences await." : 
      type === "Enquiry Submitted" ? "Your Nomichi journey is one step closer." :
      type === "New Enquiry" ? "A new enquiry has been submitted." :
      type === "Payment Reminder" ? "Important: Your booking payment balance is currently due. Please complete it to secure your slots." :
      type === "Payment Received - Traveler" ? "Your payment is confirmed. Your adventure is now officially booked!" :
      type === "Payment Received - Admin" ? "A new payment has been received and recorded in the system." :
      type === "Payment Received - Manager" ? "Your client has completed payment. Booking is now fully paid." : title}
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
