import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

const DELIVERIES_FILE = path.join(process.cwd(), "public", "mock_deliveries.json");

export interface DeliveryLog {
  id: string;
  timestamp: string;
  recipient: string;
  channel: "Email" | "WhatsApp";
  type: string;
  title: string;
  body: string;
  priority: string;
  status: "Success" | "Failed";
  details: any;
}

export async function sendEmailViaSMTP(payload: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  priority: string;
  type: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    cid: string;
    contentType?: string;
    disposition?: string;
  }>;
}): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM || "noreply@nomachi.travel";

  const isLive = !!(host && user && pass);

  if (isLive) {
    try {
      console.log(`[SMTP Live] Connecting to ${host}:${port}...`);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.body,
        html: payload.html,
        attachments: payload.attachments,
      });

      console.log(`[SMTP Live] Email successfully delivered to ${payload.to}. MessageId: ${info.messageId}`);

      const logEntry: DeliveryLog = {
        id: `email_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
        recipient: payload.to,
        channel: "Email",
        type: payload.type,
        title: payload.subject,
        body: payload.body,
        priority: payload.priority,
        status: "Success",
        details: {
          smtp_server: host,
          port,
          messageId: info.messageId,
          live: true
        },
      };

      appendLog(logEntry);
      return true;
    } catch (err: any) {
      console.error(`[SMTP Live Error] Failed to deliver email to ${payload.to}:`, err);
      const logEntry: DeliveryLog = {
        id: `email_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
        recipient: payload.to,
        channel: "Email",
        type: payload.type,
        title: payload.subject,
        body: payload.body,
        priority: payload.priority,
        status: "Failed",
        details: {
          smtp_server: host,
          port,
          error: err.message || "Unknown SMTP Error",
          live: true
        },
      };
      appendLog(logEntry);
      return false;
    }
  } else {
    // Simulation Mode Fallback
    console.log(`[SMTP Simulation] Connecting to mail.nomachi.travel:587...`);
    console.log(`[SMTP Simulation] Sending email to ${payload.to}`);
    console.log(`[SMTP Simulation] Subject: ${payload.subject}`);
    console.log(`[SMTP Simulation] Body: ${payload.body}`);

    const logEntry: DeliveryLog = {
      id: `email_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      recipient: payload.to,
      channel: "Email",
      type: payload.type,
      title: payload.subject,
      body: payload.body,
      priority: payload.priority,
      status: "Success",
      details: {
        smtp_server: "mail.nomachi.travel",
        port: 587,
        ssl: false,
        live: false
      },
    };

    appendLog(logEntry);
    return true;
  }
}

export async function sendWhatsAppViaAPI(payload: {
  phone: string;
  message: string;
  priority: string;
  type: string;
}): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const isLive = !!(token && phoneId);

  if (isLive) {
    try {
      console.log(`[WhatsApp Live] Sending message to ${payload.phone} via PhoneID ${phoneId}...`);
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: payload.phone,
            type: "text",
            text: {
              body: payload.message,
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log(`[WhatsApp Live] Message successfully delivered. Message ID: ${data.messages?.[0]?.id}`);
        const logEntry: DeliveryLog = {
          id: `wa_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          recipient: payload.phone,
          channel: "WhatsApp",
          type: payload.type,
          title: "WhatsApp Message",
          body: payload.message,
          priority: payload.priority,
          status: "Success",
          details: {
            phone_id: phoneId,
            message_id: data.messages?.[0]?.id,
            live: true
          },
        };
        appendLog(logEntry);
        return true;
      } else {
        console.error(`[WhatsApp Live Error] Meta API error response:`, data);
        const logEntry: DeliveryLog = {
          id: `wa_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          recipient: payload.phone,
          channel: "WhatsApp",
          type: payload.type,
          title: "WhatsApp Message",
          body: payload.message,
          priority: payload.priority,
          status: "Failed",
          details: {
            phone_id: phoneId,
            error: data.error || "Unknown WhatsApp Error",
            live: true
          },
        };
        appendLog(logEntry);
        return false;
      }
    } catch (err: any) {
      console.error(`[WhatsApp Live Error] Network or API failure:`, err);
      const logEntry: DeliveryLog = {
        id: `wa_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
        recipient: payload.phone,
        channel: "WhatsApp",
        type: payload.type,
        title: "WhatsApp Message",
        body: payload.message,
        priority: payload.priority,
        status: "Failed",
        details: {
          phone_id: phoneId,
          error: err.message || "Network Error",
          live: true
        },
      };
      appendLog(logEntry);
      return false;
    }
  } else {
    // Simulation Mode Fallback
    console.log(`[WhatsApp Simulation] Sending message to ${payload.phone}`);
    console.log(`[WhatsApp Simulation] Message: ${payload.message}`);

    const logEntry: DeliveryLog = {
      id: `wa_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      recipient: payload.phone,
      channel: "WhatsApp",
      type: payload.type,
      title: "WhatsApp Message",
      body: payload.message,
      priority: payload.priority,
      status: "Success",
      details: {
        api_url: "https://api.whatsapp.com/v1/messages",
        template_name: "nomachi_notification",
        live: false
      },
    };

    appendLog(logEntry);
    return true;
  }
}

function appendLog(entry: DeliveryLog) {
  try {
    let logs: DeliveryLog[] = [];
    if (fs.existsSync(DELIVERIES_FILE)) {
      const content = fs.readFileSync(DELIVERIES_FILE, "utf8");
      if (content.trim()) {
        logs = JSON.parse(content);
      }
    } else {
      // Ensure directory exists
      const dir = path.dirname(DELIVERIES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    logs.unshift(entry); // Prepend new log
    fs.writeFileSync(DELIVERIES_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to append delivery log:", err);
  }
}
