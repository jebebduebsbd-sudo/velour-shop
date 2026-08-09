# Velour community description (copy-ready)

Source of truth for the wording is `src/content/community.ts`, rendered at
`/community`. This file is the same description reshaped for the places that
only accept plain text: a server description field, a pinned rules post, a
channel topic. Edit the content module first, then mirror it here.

Nothing below invents a member count, a response time, or a guarantee. If a
number is not backed by the platform, it does not belong in the description.

---

## One-liner (<= 120 characters)

> The public space around velour.shop: lawful digital goods, real vouches,
> honest talk about orders.

## Short description (profile / "about" field)

> The Velour Community is the public discussion space around the velour.shop
> marketplace — a place to ask about a listing before you spend wallet balance,
> describe how a redemption actually went, follow platform changes, and get
> pointed at the right support channel. Buying, refunds, and disputes always
> stay on the platform.

## Long description (welcome post)

> **Velour Community**
>
> Velour sells lawful, transferable digital goods — gift codes, wallet codes,
> vouchers, and official keys. This is where the people buying and running that
> catalog talk in the open: what a listing actually delivers, which region a
> code works in, what changed in the last release, and what to do when
> something goes wrong.
>
> It is a companion to the marketplace, not a shadow version of it. Money never
> moves in chat. Purchases are paid from your Velour wallet, stock is reserved
> atomically at checkout, deliverables are encrypted and revealed only to the
> owner of a fulfilled order, and refunds are ledger entries raised from the
> order page. A helpful answer here is an opinion; a support decision only
> counts when it appears on the order or ticket inside your account.
>
> **You will fit in here if you** want a second opinion on an unfamiliar
> denomination or region before buying, want to describe a redemption in more
> detail than a star rating allows, share Velour links as an affiliate within
> the disclosure rules, or are simply curious how the wallet ledger, atomic
> reservation, and encrypted delivery work.
>
> **You will not** find account credentials, stealer logs, checkers, or a way
> to deal outside Buyer Protection. Those requests are removed on sight, and
> asking is itself a rule break.
>
> Everything is public by default. Treat a message like a forum post that
> outlives you — and never paste a delivered code, an invoice, or a document
> into it.

## Rules (pinned post)

1. **Buy and sell only on Velour.** Offering, requesting, or arranging a direct
   deal removes every protection the platform provides. It is treated as a scam
   attempt regardless of intent.
2. **No credentials or credential-shaped goods.** Account logins, mailbox
   access, session cookies, browser profiles, authenticator files, recovery
   codes, 2FA secrets, stealer logs, and checker tooling are prohibited to buy,
   sell, request, or link.
3. **No piracy, cheats, or malware.** Cracked software, cheat clients, key
   generators, and links to any of them are removed, and the account with them
   goes with the link.
4. **Never post a delivered code.** Not even a used or expired one, and not in
   a screenshot.
5. **Be honest about orders.** Do not describe an order you did not place, and
   do not call a code invalid in public before the warranty case has been
   reviewed.
6. **One account per person.** Alternate accounts used to evade moderation,
   inflate praise, or manufacture agreement are removed together.
7. **Respect other people's data.** Redact order references, emails, and
   usernames from screenshots.
8. **Keep it civil.** No harassment, hate speech, sexual content, or targeted
   pile-ons. Criticism of the platform is welcome; abuse of a person is not.
9. **No unsolicited advertising.** No promoting other shops, no unsolicited
   direct messages, and no giveaways without staff approval and a stated
   funding source.
10. **Never impersonate staff.** Copying a staff name, avatar, or role colour
    is a permanent removal on the first offence.

Enforcement runs warning → temporary mute → temporary removal → permanent
removal. Scam attempts, credential trading, malware or cheat links, and staff
impersonation skip the ladder. A community removal is not a marketplace
suspension: it does not freeze your wallet, cancel your orders, or void Buyer
Protection.

Appeals: one message with a link to the removed content and what you would do
differently. Read once, answered once.

## Safety notice (pin near the rules)

> - Velour staff will never message you first to ask for a password, a
>   delivered code, a 2FA code, or a "verification" top-up.
> - There is no middleman or escrow service here. Wallet checkout *is* the
>   escrow.
> - Nobody can add wallet balance as a favour — credit exists only after a
>   verified provider webhook, so "cheap top-ups" are always a scam.
> - If a message claims your order was cancelled or your account was frozen,
>   open velour.shop yourself instead of following the link you were sent.
> - Report impersonation with a screenshot and the account identifier, then
>   stop replying.

## Channel topics

| Channel | Topic |
| --- | --- |
| `start-here` | Rules, roles, and the account verification flow. Read before posting. |
| `announcements` | Releases, incidents, policy changes, planned maintenance. Staff only. |
| `market-talk` | Questions about listings before you buy: denominations, regions, compatibility. |
| `vouches` | How a purchase actually went, plus a link to your Verified Vouch on the product page. |
| `redemption-help` | Redemptions that are not going smoothly. Open a warranty case in parallel — this channel does not track it. |
| `affiliate-lounge` | Affiliate program notes. Disclosed referral links here only. |
| `feedback` | Feature requests and bug reports. Security issues go to support privately. |
| `off-topic` | Everything else. Same rules, lower stakes. |

## Roles

| Role | How it is earned | What it means |
| --- | --- | --- |
| Member | Join and accept the rules. | Every discussion space. |
| Verified buyer | Confirmed after at least one fulfilled Velour order. | Posting in `vouches`. Order-gated like on-site reviews, so it cannot be bought or traded. |
| Contributor | Given by moderators for consistently useful, accurate answers. | Recognition, not a discount. |
| Affiliate | Active participation in the affiliate program. | Disclosed referral links in the affiliate space only. |
| Moderator | Appointed by Velour. | Enforces the rules. No access to accounts, wallets, orders, or deliverables. |
| Staff | Velour team. | Announcements and escalation — still acting through the platform, never chat. |

## Invite links

Invite URLs are configuration, not content. Set `COMMUNITY_DISCORD_URL` and/or
`COMMUNITY_TELEGRAM_URL` (https only) in the server environment and the join
buttons appear on `/community`. While they are unset, the page says the space
is not published yet rather than linking somewhere unverified — which is also
the answer to "is this invite real?": if it is not on `/community`, it is not
ours.
