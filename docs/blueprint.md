# Crypto Alert Watchlist Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Personal crypto price alert system with configurable thresholds, percent-change alerts, and admin usage reports. Users manage private watchlists, receive non-spamming alerts during active hours, and access on-demand price checks with time-based analysis.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- retail crypto traders
- price alert subscribers
- Telegram power users

## Success criteria

- User can create and manage alerts without spam
- Admin receives aggregated usage reports
- Alerts deliver with 5min deduplication

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Onboarding and main menu
- **/price** (command, actor: user, command: /price) — Check current price(s) with optional ticker parameter
- **Add Coin** (button, actor: user, callback: watchlist:add) — Initiate coin selection and alert setup flow
- **Edit Watchlist** (button, actor: user, callback: watchlist:edit) — View and modify existing watchlist items
- **Configure Alerts** (button, actor: user, callback: alert:config) — Set alert types, windows, and quiet hours

## Flows

### Onboarding
_Trigger:_ /start

1. Explain features
2. Request timezone
3. Set default quiet hours

_Data touched:_ user_profile

### Add Coin
_Trigger:_ watchlist:add

1. Receive ticker input
2. Show coin selection list
3. Choose alert types
4. Set percent window

_Data touched:_ watchlist_item

### Price Check
_Trigger:_ /price

1. Parse optional ticker
2. Fetch current price data
3. Format response with change metrics

_Data touched:_ user_profile, watchlist_item

### Morning Summary
_Trigger:_ scheduled:user_time

1. Generate summary of active alerts
2. Include current prices
3. Send if enabled

_Data touched:_ alert_event, user_profile

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **user_profile** _(retention: persistent)_ — User preferences and settings
  - fields: telegram_id, timezone, quiet_hours, summary_time, cooldown_setting
- **watchlist_item** _(retention: persistent)_ — Active price alert configurations
  - fields: coin_id, alert_types, percent_window, user_id
- **alert_event** _(retention: persistent)_ — Delivered alert history
  - fields: coin_id, user_id, condition, old_price, new_price, timestamp
- **cooldown_tracker** _(retention: session)_ — Alert deduplication tracking
  - fields: user_id, coin_id, condition, last_fired

## Integrations

- **Telegram** (required) — Bot API messaging
- **CoinGecko** (required) — Primary price feed
- **Binance** (optional) — Secondary price feed
- **CoinMarketCap** (optional) — Fallback price feed
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure admin report chat ID
- View aggregated usage stats
- Set cooldown duration (fixed 5min in brief)

## Notifications

- Price threshold alerts
- Percent change alerts
- Morning summary digest
- Admin usage reports

## Permissions & privacy

- Encrypt user settings
- No third-party data sharing
- User consent for morning summaries

## Edge cases

- Price feed failures with silent retry
- Quiet hours alert suppression
- Duplicate alert cooldown
- Invalid ticker resolution

## Required tests

- End-to-end alert delivery with cooldown
- Morning summary generation
- Quiet hours suppression validation
- Admin report formatting

## Assumptions

- CoinGecko as primary price source
- 5min global cooldown
- User-selected percent windows
- Admin chat ID provided
