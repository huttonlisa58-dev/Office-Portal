import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';

// Creates a dashboard notification and optionally emails the user.
export async function notify({ company, user, type, title, body, link, email }) {
  const n = await Notification.create({ company, user, type, title, body, link });
  if (email) {
    sendEmail({ to: email, subject: title, html: `<p>${body}</p>` }).catch((e) =>
      console.error('notify email failed', e.message)
    );
  }
  return n;
}
