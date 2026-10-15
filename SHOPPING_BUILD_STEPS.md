# Shopping subflow — build steps (about 30–40 min)

The product logic lives in `scripts/*.js`. PAD runs each one inside the Blinkit page with
**Browser automation → Run JavaScript function on web page**. To use one: open the .js file in
Notepad, copy everything, paste into the action's "JavaScript function" box.

> One-time manual step: open blinkit.com in Chrome yourself, set your delivery location once.
> Blinkit remembers it. The bot then **verifies** it every run.

---

## A. Main — changes
1. After the 3 Read-from-CSV rows add:
   - **Set variable** `Address` = `%Settings[0]['address']%`
   - **Convert text to number** → Text `%Settings[0]['budget']%` → produces `Budget`
2. **Delete** the two TEST rows (`SummaryText` / `ShortText`).
3. Order of the Run subflow rows at the bottom:
   `Run subflow Shopping` → `Run subflow SendEmail` → `Run subflow SendWhatsApp`

---

## B. Shopping — actions in order

| # | Action (search name in Actions pane) | Settings |
|---|---|---|
| 1 | Set variable | `ErrorStep` = `Shopping` |
| 2 | Set variable | `CartTotal` = `0` |
| 3 | Set variable | `SummaryLines` = *(leave empty)* |
| 4 | Launch new Chrome | Launch new instance · URL `https://blinkit.com` · Maximized · produces `Shop` |
| 5 | Wait | `6` seconds |
| 6 | Run JavaScript function on web page | Browser `%Shop%` · paste **read_address.js** · produces `AddrShown` |
| 7 | If | `%AddrShown%` **Contains** `%Settings[0]['address_check']%` · Ignore case ON → *(inside: nothing)* |
| 8 | Else | inside: **Set variable** `ErrorMessage` = `Address mismatch. Blinkit shows: %AddrShown%` → **Run subflow** `HandleError` |
| 9 | End (of If) | |
| 10 | For each | Iterate `%Items%` · store into `Row` |
| 11 | ↳ Set variable | `ErrorStep` = `Shopping: %Row['item']%` |
| 12 | ↳ Go to web page | `%Shop%` · URL `https://blinkit.com/s/?q=%Row['item']%` |
| 13 | ↳ Wait | `5` seconds |
| 14 | ↳ Run JavaScript function on web page | `%Shop%` · paste **pick_item.js** · produces `PickRaw` |
| 15 | ↳ Split text | Text `%PickRaw%` · Custom delimiter `|` · produces `P` |
| 16 | ↳ Set variable | `PickName` = `%P[1]%` |
| 17 | ↳ Convert text to number | `%P[3]%` → `Price` |
| 18 | ↳ Convert text to number | `%Row['quantity']%` → `Qty` |
| 19 | ↳ If | `%P[0]%` Equal to `ADDED` |
| 20 | ↳↳ Wait | `2` |
| 21 | ↳↳ Loop | Start `2` · End `%Qty%` · Increment `1` |
| 22 | ↳↳↳ Run JavaScript function on web page | `%Shop%` · paste **click_plus.js** |
| 23 | ↳↳↳ Wait | `1` |
| 24 | ↳↳ End (Loop) | |
| 25 | ↳↳ Set variable | `CartTotal` = `%CartTotal + Price * Qty%` |
| 26 | ↳↳ Set variable | `SummaryLines` = (Shift+Enter for new line inside the value)<br>`%SummaryLines%- %Row['item']%: %P[1]% %P[2]% x%Qty% = Rs %Price * Qty% (Rs %P[4]%/unit) [added]`<br>`   Other options: %P[6]%` |
| 27 | ↳ Else | |
| 28 | ↳↳ Set variable | `RunStatus` = `PARTIAL` |
| 29 | ↳↳ Set variable | `SummaryLines` = `%SummaryLines%- %Row['item']%: NOT ADDED (not found / out of stock)`<br>`   Options to choose from: %P[6]%` |
| 30 | ↳ End (If) | |
| 31 | End (For each) | |
| 32 | If | `%CartTotal%` Greater than `%Budget%` → **Set variable** `RunStatus` = `PARTIAL` · End |
| 33 | Get current date and time | → `Now` |
| 34 | Convert datetime to text | `%Now%` · custom `yyyyMMdd_HHmm` → `Stamp` |
| 35 | Take screenshot | Entire screen · save to file `%ProjectDir%\output\cart_%Stamp%.png` |
| 36 | Set variable | `SummaryText` = (multi-line)<br>`Blinkit cart summary - %Stamp%`<br>`Status: %RunStatus%`<br>`Delivery address: %Address% (Blinkit shows: %AddrShown%)`<br>`Budget: Rs %Budget%   Cart total: Rs %CartTotal%`<br>`NO ORDER WAS PLACED. The bot stops before checkout/payment by design.`<br>*(blank line)*<br>`%SummaryLines%` |
| 37 | If | `%CartTotal%` Greater than `%Budget%` → **Set variable** `SummaryText` = `%SummaryText%` + new line + `WARNING: over budget by Rs %CartTotal - Budget%` · End |
| 38 | Write text to file | `%ProjectDir%\output\summary_%Stamp%.txt` · text `%SummaryText%` · Overwrite |
| 39 | Set variable | `ShortText` = `Blinkit cart ready: %Items.RowsCount% items, Rs %CartTotal% of Rs %Budget% budget. Status: %RunStatus%. No order placed. Full summary emailed.` |

**Error handling:** select rows 4–31 → right-click → there's no wrap shortcut, so instead set
**On error → Run subflow HandleError** on rows **4, 12, 14** (the ones that touch the website).

**Never** add any action that clicks Proceed / Checkout / Pay.

---

## C. Test order
1. `items.csv` → only `milk,1`, budget `1000` → Run. Check cart on Blinkit + `output\summary_*.txt`.
2. All 3 items.
3. Budget `50` → status should be PARTIAL with the over-budget warning.

## Known simplifications (say these in README / reply)
- Delivery location is set once manually; the bot verifies it each run and stops on mismatch.
- Over budget is **flagged** with cheaper options listed, not auto-swapped.
- Product parsing reads Blinkit's page text, so a Blinkit redesign may need the JS updated.
