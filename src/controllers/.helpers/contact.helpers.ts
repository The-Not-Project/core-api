import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export function formatContactMessage(
  type: "collab" | "message",
  message: string,
  email?: string,
) {
  return `
New ${type === "collab" ? "collaboration request" : "message"} from The Not Project:

${message}

---
Email: ${email?.trim() ? email : "not provided"}
    `.trim();
}

export async function sendContactEmail(type: string, content: string) {
  await resend.emails.send({
    from: "The Not Project <contact@thenotproject.com>",
    to: [
    //   "lorenzo@thenotproject.com",
      "elghayate02@gmail.com",
    //   "sebastian.torres.codes@gmail.com",
    ],
    subject:
      type === "collab"
        ? "New Collaboration Request"
        : "New Message from The Not Project",
    text: content,
  });
}

export async function sendConfirmationEmail(email: string, type: string) {
    await resend.emails.send({
        from: "The Not Project <contact@thenotproject.com>",
        to: [email.trim()],
        subject:
          type === "collab"
            ? "Thanks for reaching out to collaborate"
            : "Thanks for your message",
        text:
          type === "collab"
            ? "Thanks for reaching out to collaborate! We'll read your message and get back to you soon."
            : "Hey! We got your message. If needed, we’ll get back to you soon.",
      });
}