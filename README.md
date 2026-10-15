# Blinkit Grocery Assistant — Power Automate Desktop

An RPA bot built in **Power Automate Desktop (PAD)** that prepares a Blinkit grocery cart from a configurable shopping list, checks it against a budget, and sends a summary by **Gmail** and **WhatsApp**.

It **stops before checkout** — no order is placed and no payment is started.

![cart](screenshots/cart_result.png)

---

## What it does

1. Reads the shopping list, delivery address and budget from CSV files
2. Opens Blinkit and **verifies the delivery location** (stops if it doesn't match)
3. For each item: searches Blinkit, reads every product card, and **picks the lowest price per unit** (₹/L or ₹/kg) among in-stock products
4. Adds the pick to the cart and records cheaper alternatives
5. Totals the cart and **flags it if it's over budget**
6. Saves a summary file and a cart screenshot
7. Emails the full summary (Gmail SMTP) and sends a short WhatsApp notification
8. Any failure is logged with a screenshot and the run stops safely

Example result (budget ₹300):

| Item | Picked | Price | Per unit |
|---|---|---|---|
| Milk | Amul Taaza Toned Milk 500 ml | ₹29 | ₹58/L |
| Bread | Modern Sandwich Supreme White Bread 450 g | ₹47 | ₹104/kg |
| Yogurt | Hatsun Strawberry Yogurt 175 ml | ₹30 | — |
| **Total** | | **₹106** | within budget |

---

## Structure

```
config/
  items.csv               shopping list       (item,quantity)
  settings.csv            run settings        (address,address_check,budget)
  secrets.example.csv     template for secrets.csv (never committed)
scripts/
  read_address.js         reads the delivery location Blinkit shows
  pick_item.js            parses product cards, picks best price-per-unit, clicks ADD
  click_plus.js           increases quantity for an added product
flows/                    PAD actions exported per subflow (copy-paste into PAD)
output/                   summaries, cart screenshots, error log (generated)
screenshots/              demo screenshots
```

### Subflows

| Subflow | Responsibility |
|---|---|
| **Main** | Loads + validates config, then runs Shopping → SendEmail → SendWhatsApp |
| **Shopping** | Address check, item loop, product choice, cart total, summary, screenshot |
| **SendEmail** | Sends `SummaryText` via Gmail SMTP — reusable for any text |
| **SendWhatsApp** | Sends `ShortText` via WhatsApp Web — reusable for any text |
| **HandleError** | Logs time/step/message to `output/error_log.txt`, saves a screenshot, stops the flow |

PAD subflows share variables rather than taking parameters, so each subflow reads a small, documented set of variables (`SummaryText`, `ShortText`, `ErrorStep`, `ErrorMessage`) — that's what keeps them reusable.

---

## Design decisions

- **JavaScript inside the page instead of recorded UI selectors.** Blinkit's markup uses generated class names that change often. Reading visible text (`₹`, sizes like `500 ml`, the `ADD` button) is far more stable than recorded selectors.
- **Price per unit, not raw price.** Sizes are normalised to litres/kg so a 1 L pack and a 500 ml pack compare fairly. Products whose size can't be parsed are skipped rather than guessed.
- **Pincode check for the address.** Blinkit shows long, inconsistently formatted addresses; the pincode is the reliable part.
- **WhatsApp direct-chat URL** (`web.whatsapp.com/send?phone=…`) instead of searching contacts — search results load asynchronously and made the bot flaky.
- **Centralised error handling.** Every failure goes through one subflow, so behaviour and logs are consistent.
- **Hard stop before checkout.** No action in the flow touches login, checkout or payment.

## Error handling rules

| Situation | Behaviour |
|---|---|
| Config file missing / invalid | Log + stop |
| Delivery location doesn't match | Log + stop |
| Item has no parseable in-stock product | Marked "NOT ADDED", alternatives listed, run continues (status PARTIAL) |
| Cart over budget | Flagged in summary (status PARTIAL) |
| Gmail fails | Summary already saved, WhatsApp skipped, stop |
| WhatsApp fails | Log + stop |

---

## Setup (Windows)

1. Install **Power Automate** (Microsoft Store) and the **Power Automate extension for Chrome** (PAD → Tools → Browser extensions → Chrome). Make sure it's enabled in Chrome.
2. Clone/copy this folder to `C:\blinkit-assistant` (or change `ProjectDir` in Main).
3. Copy `config/secrets.example.csv` → `config/secrets.csv` and fill in:
   - `gmail_user` — your Gmail
   - `gmail_app_password` — a Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords)
   - `email_to` — approved test recipient
   - `whatsapp_contact`, `whatsapp_phone` — approved test contact (phone with country code, no `+`)
4. Edit `config/settings.csv` with your address and its **pincode** as `address_check`, and your budget.
5. In Chrome: open blinkit.com and set your delivery location once; open web.whatsapp.com and scan the QR code once.
6. In PAD create a flow with subflows `Shopping`, `SendEmail`, `SendWhatsApp`, `HandleError`, and paste the actions from `flows/`.
7. Run. Results appear in `output/`, your inbox and WhatsApp.

## Known limitations

- Delivery location is set once manually; the bot verifies it each run rather than changing it.
- Over-budget carts are **flagged** with cheaper options listed, not automatically swapped.
- Quantity defaults to 1 per item (`click_plus.js` supports more).
- Product parsing depends on Blinkit's visible page text; a major redesign may need the script updated.
- WhatsApp uses WhatsApp Web automation (the Business API needs a verified business account).

---

Built by **Akanksha Mattoo** as an internship technical assignment.
