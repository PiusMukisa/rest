# Rest Church Ministries

A responsive, multi-page church website with a Supabase database, a protected admin dashboard, contact-message management, and direct ABSA transfer instructions. The site does not accept or confirm online payments.

## What is included

- Home, About Us, Contact Us, Donations, and Admin pages.
- A Projects page with church-provided presentation downloads and in-page PDF previews.
- Supabase-backed editable website copy and contact details.
- Admin image uploads for the church logo and selected Home/About page photos, stored in a public Supabase Storage bucket with admin-only upload access.
- A public contact form; messages are private to approved administrators.
- A database-side limit of five contact submissions per email address per hour, plus a hashed-IP limit on contact email delivery.
- Admin sign-in, verified-contribution records, currency-separated contribution totals, recent transactions, message status management, and a website-content editor.
- Row-level security policies in `supabase/schema.sql`.
- Security response headers for Netlify in `_headers`.

## Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor. If you already applied an earlier version, run the current schema again to add the image bucket and policies; the script is safe to re-run.
2. In Authentication, create an administrator user. Do not enable public sign-up for the website.
3. Add that user's UUID to the administrator allowlist in the SQL Editor:

   ```sql
   insert into public.admins (user_id)
   values ('AUTH_USER_UUID');
   ```

4. Copy the project's **Project URL** and **publishable/anon key** into `assets/js/config.js`:

   ```js
   window.REST_CHURCH_CONFIG = Object.freeze({
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY"
   });
   ```

   The anon key is intended for browser use. **Never put a Supabase `service_role` key in this website.** Database access is restricted by the SQL grants and row-level security policies.

5. In Supabase Authentication URL settings, set the deployed website as the Site URL. Add redirect URLs only if you later enable an authentication flow that uses redirects.
6. Serve the project from a web server (not `file://`) and use HTTPS. Netlify reads the supplied `_headers`; configure equivalent headers, including the Content Security Policy, if using another host. If using a custom Supabase hostname, update `connect-src` in that policy.
7. In the admin dashboard’s website-content section, choose a photo from your computer to upload and publish it immediately. Uploads accept JPG, PNG, or WebP files up to 5 MB. Use **Save website content** for text and pasted image URLs. Uploaded images are public because they appear on the public website; only approved admins can upload or update them.

If you already applied an earlier version of the database schema, run this once to add the new optional pastor-video content field:

```sql
insert into public.site_content (key, value)
values ('pastor_video_url', 'https://www.tiktok.com/@muwayifaizal/video/7704317331232607495?is_from_webapp=1&sender_device=pc')
on conflict (key) do update set value = excluded.value;
```

## Before launch

- The supplied Rest Church Ministries logo, pastor photo, and church ministry photos are included in `assets/images/`. The About Us page presents the supplied church story, vision, mission, objectives, core values, statement of faith, and leadership.
- Confirm that the phrase “We are Cross Point” in the supplied statement of faith is intentional before launch; it appears as provided.
- The ABSA account, SWIFT code, and mobile money contacts shown on the Donations page were transcribed from the supplied land appeal poster. Confirm the recipient with church leadership before sending money. A bank sort/code was not shown on the poster.
- The homepage Play Video button opens the supplied TikTok pastor video. A secure MP4, WebM, or Ogg URL, or a valid YouTube, Vimeo, or TikTok link, can also be set in the admin dashboard’s Pastor video URL field.
- The supplied toilet-building and living-water project presentations are available on the Projects page as original PowerPoint downloads and PDF previews.
- The Donations page shows the bank account and mobile money contacts from the supplied church land poster. Mobile-money contacts open the phone dialer; the website does not make mobile-money payments or claim to confirm a contribution.
- The public Contact form stores messages in the protected database and sends a notification to the church using a Supabase Edge Function and Resend. The contact form is not email-enabled until that function is deployed and configured as described below.
- Set up administrator accounts and a process for reviewing contact-message access. Remove an administrator from `public.admins` and disable that account in Supabase when access is revoked.
- The contact function limits delivery to five requests per IP address per hour and five submissions per email address per hour. Consider a CAPTCHA as well if the public form attracts abuse.

### Set up contact-message email

The public form calls `supabase/functions/send-contact-message/index.ts`. The function saves each message in the private admin message queue, applies both IP- and email-based submission limits, then sends a notification to `restchurh37@gmail.com`. Email is sent by Resend; the visitor’s address is included as the reply-to address.

1. Create a Resend account and verify a sender address on a domain you control. The church recipient is already set in the function; never use an unverified or third-party address as the sender.
2. Deploy the site and configure the public API key used by the browser, the exact site origin, your Resend key, and a verified sender. The site public key is also configured in `assets/js/config.js`; the Edge Function checks it without putting a service-role key in the browser. Never expose a service-role key. Replace the placeholders with your own values; do not commit API keys:

   ```text
   supabase secrets set REST_CHURCH_PUBLIC_API_KEY=YOUR_FRONTEND_SUPABASE_PUBLIC_KEY SITE_URL=https://YOUR_WEBSITE_DOMAIN REST_CHURCH_FROM_EMAIL=website@YOUR_VERIFIED_DOMAIN RESEND_API_KEY=YOUR_RESEND_API_KEY
   ```

3. Apply the current `supabase/schema.sql` to your Supabase project. If you already ran an earlier schema, run the updated schema to create the private IP-rate-limit table and function as well.
4. Deploy the email function:

   ```text
   supabase functions deploy send-contact-message
   ```

When the Supabase project isn't configured or the email function cannot send, the Contact form opens a pre-addressed email to the church with the visitor's message prepared. The visitor must press Send in their email app; opening a draft does not itself send an email. Visitors can also email or call the church directly using the visible links.

The bank account and SWIFT code are transcribed from the church’s poster. Confirm the recipient/account with church leadership before making a transfer. The donation details are displayed directly on the donations page so no old database value can silently replace the printed account. If the church updates its details, update `donations.html`, the poster asset, and the Supabase website-content seed together. Existing Supabase projects can update the visible contact email and primary telephone number in the website-content editor.

## Donation recordkeeping

Donors transfer funds through their bank; the site does not process a payment, collect donor payment details, accept proof-of-payment uploads, or send payment confirmations. Administrators may add a contribution to the private register only after verifying the transaction against the church's bank statement. Dashboard totals are grouped by currency and include only those administrator-entered records. Removing a record changes the website register only, not the bank transaction.

## Notes

The Supabase JavaScript client and Google Fonts load from their respective CDNs. A network connection is required for these services. The admin session is held in the current browser session rather than persistent local storage.
