# Scholarship Ledger — paid trial version

This adds a 3-day free trial, then $7.99 CAD/month, in front of your app.
Nobody sees the actual app until they've started a trial or are paying.

Everything below is done through website dashboards — no terminal needed.

## 1. Create a Stripe account
Go to stripe.com and sign up. Stripe is who actually processes the card
payments — Cloudflare doesn't do that part.

## 2. Create your product and price in Stripe
- In the Stripe dashboard, go to Product Catalog → Add a product
- Name it (e.g. "Scholarship Ledger Pro")
- Set pricing: Recurring, $7.99 CAD, Monthly
- Save it, then click into the price you just made and copy its **Price ID**
  (looks like `price_1AbCdEfGhIjKlM`) — you'll need this below

## 3. Get your Stripe secret key
- In Stripe, go to Developers → API keys
- Copy your **Secret key** (starts with `sk_`) — keep this private, never put
  it in code or share it

## 4. Create the database in Cloudflare
- In the Cloudflare dashboard, look for **Storage & Databases → D1** in the
  left sidebar
- Click Create Database, name it (e.g. `scholarship-db`)
- Once created, open it and find the **Console** tab
- Paste in the contents of `schema.sql` (included in this folder) and run it
  — this creates the table that tracks who's on trial or subscribed

## 5. Upload this project to Cloudflare Pages
- Same process as before: Workers & Pages → Create → Pages → Upload assets
- This time, upload the **whole folder** (not just one file) — make sure
  `public/`, `functions/`, and everything inside them go up together
- If the upload tool asks for a "build output directory," point it at `public`

## 6. Connect the database to your Pages project
- In your Pages project, go to Settings → Functions → D1 database bindings
- Add a binding: Variable name = `DB`, Database = the one you created in step 4

## 7. Add your Stripe keys as environment variables
- In the same Pages project, go to Settings → Environment variables
- Add:
  - `STRIPE_SECRET_KEY` = your secret key from step 3
  - `STRIPE_PRICE_ID` = your price ID from step 2
- Mark `STRIPE_SECRET_KEY` as "Encrypt" / secret if given the option

## 8. Redeploy
- After adding the bindings and variables, trigger a new deployment (re-upload
  or use "Retry deployment") so the changes take effect

## 9. Connect the webhook (keeps trial/payment status up to date)
- In Stripe, go to Developers → Webhooks → Add endpoint
- URL: `https://YOUR-APP.pages.dev/api/stripe-webhook` (use your real Pages URL)
- Events to send: `customer.subscription.updated`, `customer.subscription.deleted`

## 10. Test it
- Visit your site — you should now see the paywall page, not the app
- Click "Start free trial" — it should send you to a real Stripe checkout page
- Use Stripe's test card number `4242 4242 4242 4242`, any future expiry date,
  any CVC, while your Stripe account is in test mode
- After completing checkout, you should land back on your site and see the
  actual app

## Before charging real people
- Switch your Stripe account from **test mode** to **live mode** (top-left
  toggle in Stripe dashboard), and swap in your live secret key + live price ID
- Add a visible Terms of Service / cancellation policy — Canadian consumer
  protection rules require clear trial and pricing disclosure
- Consider adding a "Manage subscription" link (Stripe has a built-in
  Customer Portal for this) so people can cancel without emailing you
