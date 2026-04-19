import type { Request, Response } from "express";
import {
  formatContactMessage,
  sendConfirmationEmail,
  sendContactEmail,
} from "../.helpers/contact.helpers.js";

export async function handleContactForm(req: Request, res: Response) {
  const { message, email, type } = req.body;

  if (!message || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const content = formatContactMessage(type, message, email);

    await sendContactEmail(type, content);

    if (email?.trim()) {
      await sendConfirmationEmail(email, type);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
